use std::path::Path;

use windows::Win32::Foundation::{CloseHandle, HWND};
use windows::Win32::System::Com::{
    CLSCTX_INPROC_SERVER, COINIT_MULTITHREADED, CoCreateInstance, CoInitializeEx, CoUninitialize,
};
use windows::Win32::System::Threading::{
    OpenProcess, PROCESS_NAME_WIN32, PROCESS_QUERY_LIMITED_INFORMATION, QueryFullProcessImageNameW,
};
use windows::Win32::System::Variant::VARIANT;
use windows::Win32::UI::Accessibility::*;
use windows::Win32::UI::Accessibility::{
    ToggleState_Off as TOGGLE_OFF, ToggleState_On as TOGGLE_ON, UIA_ButtonControlTypeId as BUTTON,
    UIA_CheckBoxControlTypeId as CHECK_BOX, UIA_ComboBoxControlTypeId as COMBO_BOX,
    UIA_EditControlTypeId as EDIT, UIA_GroupControlTypeId as GROUP, UIA_PaneControlTypeId as PANE,
    UIA_RadioButtonControlTypeId as RADIO_BUTTON, UIA_SpinnerControlTypeId as SPINNER,
};
use windows::Win32::UI::WindowsAndMessaging::{GetForegroundWindow, GetWindowThreadProcessId};
use windows::core::{BSTR, PWSTR};

use crate::form::{self, Control, Field, Review};
use crate::profile::{Profile, normalize_label, value_for};

pub enum Outcome {
    OutsideFirefox,
    NoDocument,
    Unavailable,
    Filled {
        changed: usize,
        existing: usize,
        failed: usize,
        review: u16,
    },
}

struct Apartment;

impl Apartment {
    fn initialize() -> windows::core::Result<Self> {
        unsafe { CoInitializeEx(None, COINIT_MULTITHREADED).ok()? };
        Ok(Self)
    }
}

impl Drop for Apartment {
    fn drop(&mut self) {
        unsafe { CoUninitialize() };
    }
}

pub fn is_firefox(window: HWND) -> bool {
    let mut pid = 0;
    unsafe {
        GetWindowThreadProcessId(window, Some(&mut pid));
        let Ok(process) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) else {
            return false;
        };
        let mut image_path = [0u16; 1024];
        let mut length = image_path.len() as u32;
        let result = QueryFullProcessImageNameW(
            process,
            PROCESS_NAME_WIN32,
            PWSTR(image_path.as_mut_ptr()),
            &mut length,
        );
        let _ = CloseHandle(process);
        result.is_ok()
            && Path::new(&String::from_utf16_lossy(&image_path[..length as usize]))
                .file_name()
                .is_some_and(|name| name.eq_ignore_ascii_case("firefox.exe"))
    }
}

struct Scope {
    document: IUIAutomationElement,
    container: Option<IUIAutomationElement>,
}

fn element_scope(
    walker: &IUIAutomationTreeWalker,
    mut element: IUIAutomationElement,
) -> Option<Scope> {
    let mut container = None;
    unsafe {
        for _ in 0..80 {
            let control_type = element.CurrentControlType().ok()?;
            if control_type == UIA_DocumentControlTypeId {
                return Some(Scope {
                    document: element,
                    container,
                });
            }
            if container.is_none()
                && element
                    .CurrentAriaRole()
                    .ok()
                    .is_some_and(|role| role == "form" || role == "dialog" || role == "alertdialog")
            {
                container = Some(element.clone());
            }
            element = walker.GetParentElement(&element).ok()?;
        }
        None
    }
}

fn same_element(
    automation: &IUIAutomation,
    a: &IUIAutomationElement,
    b: &IUIAutomationElement,
) -> bool {
    unsafe {
        automation
            .CompareElements(a, b)
            .is_ok_and(|result| result.as_bool())
    }
}

pub fn fill(window: HWND, profile: &Profile) -> Outcome {
    if window != unsafe { GetForegroundWindow() } || !is_firefox(window) {
        return Outcome::OutsideFirefox;
    }
    fill_active(window, profile).unwrap_or(Outcome::Unavailable)
}

fn fill_active(window: HWND, profile: &Profile) -> windows::core::Result<Outcome> {
    let _apartment = Apartment::initialize()?;
    unsafe {
        let automation: IUIAutomation =
            CoCreateInstance(&CUIAutomation, None, CLSCTX_INPROC_SERVER)?;
        let walker = automation.RawViewWalker()?;
        let Some(scope) = automation
            .GetFocusedElement()
            .ok()
            .and_then(|element| element_scope(&walker, element))
        else {
            return Ok(Outcome::NoDocument);
        };
        let search_root = scope.container.as_ref().unwrap_or(&scope.document);
        let live = LiveForm {
            window,
            automation: &automation,
            walker: &walker,
            scope: &scope,
        };
        let wellfound =
            document_address(&scope.document).is_some_and(|url| form::is_wellfound_job(&url));
        let type_condition = |control_type: UIA_CONTROLTYPE_ID| {
            automation
                .CreatePropertyCondition(UIA_ControlTypePropertyId, &VARIANT::from(control_type.0))
        };
        let edit_condition = type_condition(EDIT)?;
        let types = [EDIT, COMBO_BOX, CHECK_BOX, SPINNER, RADIO_BUTTON, BUTTON]
            .into_iter()
            .map(|kind| type_condition(kind).map(Some))
            .collect::<windows::core::Result<Vec<_>>>()?;
        let condition = automation.CreateOrConditionFromNativeArray(&types)?;
        let controls = search_root.FindAll(TreeScope_Descendants, &condition)?;
        let mut report = Report::default();
        let mut location = None;
        let mut locations = 0;
        for index in 0..controls.Length()? {
            if GetForegroundWindow() != window {
                break;
            }
            let Ok(control) = controls.GetElement(index) else {
                continue;
            };
            let Some(candidate) = inspect_control(&live, &edit_condition, control, wellfound)
            else {
                continue;
            };
            if !live.is_active() {
                break;
            }
            if matches!(candidate.field, Field::Location) {
                locations += 1;
                location = Some(candidate);
            } else {
                report.apply(&live, candidate, profile);
            }
        }
        // Location suggestions can cover the next fields, so open them only after processing the form.
        if locations == 1 && live.is_active() {
            if let Some(candidate) = location {
                report.apply(&live, candidate, profile);
            }
        } else if locations > 1 {
            report.review |= Review::Location as u16;
        }
        Ok(Outcome::Filled {
            changed: report.changed,
            existing: report.existing,
            failed: report.failed,
            review: report.review,
        })
    }
}

struct LiveForm<'a> {
    window: HWND,
    automation: &'a IUIAutomation,
    walker: &'a IUIAutomationTreeWalker,
    scope: &'a Scope,
}

impl LiveForm<'_> {
    fn contains(&self, mut element: IUIAutomationElement) -> bool {
        unsafe {
            for _ in 0..80 {
                if let Some(container) = &self.scope.container
                    && same_element(self.automation, &element, container)
                {
                    return true;
                }
                if element.CurrentControlType().ok() == Some(UIA_DocumentControlTypeId) {
                    return self.scope.container.is_none()
                        && same_element(self.automation, &element, &self.scope.document);
                }
                if self.scope.container.is_none()
                    && element.CurrentAriaRole().is_ok_and(|role| {
                        role == "form" || role == "dialog" || role == "alertdialog"
                    })
                {
                    return false;
                }
                let Ok(parent) = self.walker.GetParentElement(&element) else {
                    break;
                };
                element = parent;
            }
        }
        false
    }

    fn is_active(&self) -> bool {
        unsafe {
            GetForegroundWindow() == self.window
                && self
                    .automation
                    .GetFocusedElement()
                    .is_ok_and(|focused| self.contains(focused))
        }
    }
}

fn document_address(document: &IUIAutomationElement) -> Option<String> {
    unsafe {
        let value = read_value(document).filter(|value| !value.is_empty());
        value.or_else(|| {
            document
                .GetCurrentPatternAs::<IUIAutomationLegacyIAccessiblePattern>(
                    UIA_LegacyIAccessiblePatternId,
                )
                .ok()?
                .CurrentValue()
                .ok()
                .map(|value| value.to_string())
        })
    }
}

struct Candidate {
    node: IUIAutomationElement,
    field: Field,
    picker: Option<Picker>,
}

struct Picker {
    widget: IUIAutomationElement,
    region: IUIAutomationElement,
    placeholder: bool,
}

fn inspect_control(
    live: &LiveForm<'_>,
    edit_condition: &IUIAutomationCondition,
    node: IUIAutomationElement,
    wellfound: bool,
) -> Option<Candidate> {
    unsafe {
        if !node.CurrentIsEnabled().ok()?.as_bool() || !live.contains(node.clone()) {
            return None;
        }
        let node_type = node.CurrentControlType().ok()?;
        let is_password = node.CurrentIsPassword().ok()?.as_bool();
        let mut groups = Vec::new();
        let mut current = node.clone();
        let mut combo = None;
        for _ in 0..7 {
            let Ok(parent) = live.walker.GetParentElement(&current) else {
                break;
            };
            let role = parent.CurrentAriaRole().unwrap_or_default();
            let kind = parent.CurrentControlType().ok()?;
            if kind == UIA_DocumentControlTypeId
                || role == "form"
                || role == "dialog"
                || role == "alertdialog"
            {
                break;
            }
            if combo.is_none() && (kind == COMBO_BOX || role == "combobox") {
                combo = Some(parent.clone());
            }
            if matches!(kind, GROUP | COMBO_BOX | PANE) {
                let name = parent.CurrentName().unwrap_or_default().to_string();
                if !name.trim().is_empty() && name.len() <= 180 {
                    groups.push((parent.clone(), name));
                }
            }
            current = parent;
        }
        let control = if is_password {
            Control::Password
        } else {
            match node_type {
                EDIT if combo.is_some()
                    || node.CurrentAriaRole().is_ok_and(|role| role == "combobox")
                    || node
                        .GetCurrentPatternAs::<IUIAutomationExpandCollapsePattern>(
                            UIA_ExpandCollapsePatternId,
                        )
                        .is_ok() =>
                {
                    Control::Picker
                }
                EDIT => Control::Edit,
                COMBO_BOX => {
                    if node
                        .FindFirst(TreeScope_Descendants, edit_condition)
                        .is_ok_and(|edit| visible(&edit))
                    {
                        return None;
                    }
                    Control::Picker
                }
                CHECK_BOX => Control::CheckBox,
                SPINNER => Control::Number,
                RADIO_BUTTON => Control::Radio,
                BUTTON => Control::Button,
                _ => return None,
            }
        };
        let name = node.CurrentName().unwrap_or_default().to_string();
        let label = node
            .CurrentLabeledBy()
            .and_then(|label| label.CurrentName())
            .unwrap_or_default()
            .to_string();
        let id = wellfound.then(|| node.CurrentAutomationId().unwrap_or_default().to_string());
        let group_labels = groups
            .iter()
            .map(|(_, name)| name.as_str())
            .collect::<Vec<_>>();
        let field = form::classify(control, &name, &label, &group_labels, id.as_deref())?;
        let picker = match field {
            Field::Location | Field::Experience => {
                let key = if field == Field::Location {
                    "location"
                } else {
                    "experience"
                };
                let widget = combo.unwrap_or_else(|| node.clone());
                let region = groups
                    .iter()
                    .find(|(_, label)| form::labels_picker(label, key))
                    .map_or_else(|| widget.clone(), |(element, _)| element.clone());
                let placeholder = field == Field::Location && form::is_placeholder(&name)
                    || std::iter::once(name.as_str())
                        .chain(group_labels)
                        .any(|text| form::picker_shows_placeholder(text, key));
                Some(Picker {
                    widget,
                    region,
                    placeholder,
                })
            }
            _ => None,
        };
        Some(Candidate {
            node,
            field,
            picker,
        })
    }
}

#[derive(Default)]
struct Report {
    changed: usize,
    existing: usize,
    failed: usize,
    review: u16,
}

impl Report {
    fn apply(&mut self, live: &LiveForm<'_>, candidate: Candidate, profile: &Profile) {
        let Candidate {
            node,
            field,
            picker,
        } = candidate;
        let (result, review) = match field {
            Field::Manual(review) => (FieldOutcome::Review, Some(review)),
            Field::Text(key) => (
                value_for(profile, key).map_or(FieldOutcome::Ignored, |value| {
                    write_text(live, &node, &value, false)
                }),
                None,
            ),
            Field::Location => (
                picker.map_or(FieldOutcome::Review, |picker| {
                    fill_location(live, &node, &picker, profile)
                }),
                Some(Review::Location),
            ),
            Field::Experience => (
                picker.map_or(FieldOutcome::Review, |picker| {
                    fill_experience(live, &picker, profile)
                }),
                Some(Review::Experience),
            ),
            Field::Remote => (fill_remote(live, &node, profile), Some(Review::Remote)),
        };
        match result {
            FieldOutcome::Changed => self.changed += 1,
            FieldOutcome::Existing => self.existing += 1,
            FieldOutcome::Failed if review.is_none() => self.failed += 1,
            FieldOutcome::Review | FieldOutcome::Failed => {
                if let Some(review) = review {
                    self.review |= review as u16;
                }
            }
            FieldOutcome::Ignored => {}
        }
    }
}

#[derive(PartialEq)]
enum FieldOutcome {
    Changed,
    Existing,
    Failed,
    Review,
    Ignored,
}

fn visible(control: &IUIAutomationElement) -> bool {
    unsafe {
        control
            .CurrentIsOffscreen()
            .is_ok_and(|result| !result.as_bool())
    }
}

fn read_value(control: &IUIAutomationElement) -> Option<String> {
    unsafe {
        control
            .GetCurrentPatternAs::<IUIAutomationValuePattern>(UIA_ValuePatternId)
            .ok()?
            .CurrentValue()
            .ok()
            .map(|value| value.to_string())
    }
}

fn write_text(
    live: &LiveForm<'_>,
    control: &IUIAutomationElement,
    value: &str,
    allow_placeholder: bool,
) -> FieldOutcome {
    unsafe {
        if !control
            .CurrentIsEnabled()
            .is_ok_and(|value| value.as_bool())
            || !visible(control)
            || !control
                .CurrentIsPassword()
                .is_ok_and(|value| !value.as_bool())
        {
            return FieldOutcome::Ignored;
        }
        let Ok(pattern) =
            control.GetCurrentPatternAs::<IUIAutomationValuePattern>(UIA_ValuePatternId)
        else {
            return FieldOutcome::Failed;
        };
        if !pattern
            .CurrentIsReadOnly()
            .is_ok_and(|value| !value.as_bool())
        {
            return FieldOutcome::Ignored;
        }
        let Ok(previous) = pattern.CurrentValue() else {
            return FieldOutcome::Failed;
        };
        if !(previous.is_empty()
            || allow_placeholder && form::is_placeholder(&previous.to_string()))
        {
            return FieldOutcome::Existing;
        }
        if !live.is_active() {
            return FieldOutcome::Ignored;
        }
        let requested = BSTR::from(value);
        if pattern.SetValue(&requested).is_ok()
            && pattern
                .CurrentValue()
                .is_ok_and(|actual| actual == requested)
        {
            FieldOutcome::Changed
        } else {
            FieldOutcome::Failed
        }
    }
}

fn fill_location(
    live: &LiveForm<'_>,
    control: &IUIAutomationElement,
    picker: &Picker,
    profile: &Profile,
) -> FieldOutcome {
    if !same_element(live.automation, control, &picker.widget) {
        match read_value(&picker.widget) {
            Some(value) if !value.is_empty() && !form::is_placeholder(&value) => {
                return FieldOutcome::Existing;
            }
            None if !picker.placeholder => return FieldOutcome::Review,
            _ => {}
        }
    }
    let location = profile.get("location").cloned().or_else(|| {
        let (city, country) = (profile.get("city")?, profile.get("country")?);
        Some(format!("{city}, {country}"))
    });
    match location.map(|value| write_text(live, control, &value, picker.placeholder)) {
        Some(FieldOutcome::Existing) => FieldOutcome::Existing,
        // An address search is still pending until the applicant confirms a suggestion.
        _ => FieldOutcome::Review,
    }
}

fn fill_remote(
    live: &LiveForm<'_>,
    control: &IUIAutomationElement,
    profile: &Profile,
) -> FieldOutcome {
    unsafe {
        let Ok(toggle) =
            control.GetCurrentPatternAs::<IUIAutomationTogglePattern>(UIA_TogglePatternId)
        else {
            return FieldOutcome::Review;
        };
        match toggle.CurrentToggleState().ok() {
            Some(TOGGLE_ON) => FieldOutcome::Existing,
            Some(TOGGLE_OFF)
                if visible(control)
                    && live.is_active()
                    && profile.get("modality").is_some_and(|value| {
                        matches!(normalize_label(value).as_str(), "remoto" | "remote")
                    }) =>
            {
                if toggle.Toggle().is_ok() && toggle.CurrentToggleState().ok() == Some(TOGGLE_ON) {
                    FieldOutcome::Changed
                } else {
                    FieldOutcome::Review
                }
            }
            _ => FieldOutcome::Review,
        }
    }
}

fn fill_experience(live: &LiveForm<'_>, picker: &Picker, profile: &Profile) -> FieldOutcome {
    unsafe {
        let widget = &picker.widget;
        let mut empty = picker.placeholder;
        if let Some(value) = read_value(widget).filter(|value| !value.is_empty()) {
            if !form::is_placeholder(&value) {
                return FieldOutcome::Existing;
            }
            empty = true;
        }
        if let Ok(selected) = widget
            .GetCurrentPatternAs::<IUIAutomationSelectionPattern>(UIA_SelectionPatternId)
            .and_then(|pattern| pattern.GetCurrentSelection())
            && let Ok(length) = selected.Length()
        {
            for index in 0..length {
                if !selected
                    .GetElement(index)
                    .and_then(|item| item.CurrentName())
                    .is_ok_and(|name| form::is_placeholder(&name.to_string()))
                {
                    return FieldOutcome::Existing;
                }
            }
            empty = true;
        }
        let Some(years) = profile
            .get("experience")
            .and_then(|value| form::experience_years(value))
        else {
            return FieldOutcome::Review;
        };
        if !empty || !visible(widget) || !live.is_active() {
            return FieldOutcome::Review;
        }
        let expanded = widget
            .GetCurrentPatternAs::<IUIAutomationExpandCollapsePattern>(UIA_ExpandCollapsePatternId)
            .ok();
        let opened = expanded.as_ref().is_some_and(|pattern| {
            pattern.CurrentExpandCollapseState().ok() == Some(ExpandCollapseState_Collapsed)
                && pattern.Expand().is_ok()
        });
        let attempts = if opened { 5 } else { 1 };
        let mut selected = false;
        for attempt in 0..attempts {
            if !live.is_active() {
                break;
            }
            if let Some(option) = exact_experience_option(live, &picker.region, years) {
                if live.is_active() && option.Select().is_ok() {
                    selected = option
                        .CurrentIsSelected()
                        .is_ok_and(|value| value.as_bool())
                        || read_value(widget).and_then(|value| form::experience_years(&value))
                            == Some(years);
                }
                break;
            }
            if attempt + 1 < attempts {
                std::thread::sleep(std::time::Duration::from_millis(45));
            }
        }
        if opened
            && live.is_active()
            && let Some(pattern) = expanded
        {
            let _ = pattern.Collapse();
        }
        if selected {
            FieldOutcome::Changed
        } else {
            FieldOutcome::Review
        }
    }
}

fn exact_experience_option(
    live: &LiveForm<'_>,
    region: &IUIAutomationElement,
    years: u16,
) -> Option<IUIAutomationSelectionItemPattern> {
    unsafe {
        let list_item = live
            .automation
            .CreatePropertyCondition(
                UIA_ControlTypePropertyId,
                &VARIANT::from(UIA_ListItemControlTypeId.0),
            )
            .ok()?;
        let option_role = live
            .automation
            .CreatePropertyCondition(UIA_AriaRolePropertyId, &VARIANT::from(BSTR::from("option")))
            .ok()?;
        let condition = live
            .automation
            .CreateOrCondition(&list_item, &option_role)
            .ok()?;
        let options = region.FindAll(TreeScope_Descendants, &condition).ok()?;
        let mut matched = None;
        for index in 0..options.Length().ok()? {
            let item = options.GetElement(index).ok()?;
            if visible(&item)
                && item
                    .CurrentIsEnabled()
                    .is_ok_and(|enabled| enabled.as_bool())
                && item
                    .CurrentName()
                    .ok()
                    .and_then(|name| form::experience_years(&name.to_string()))
                    == Some(years)
            {
                if matched.is_some() {
                    return None;
                }
                matched = Some(
                    item.GetCurrentPatternAs::<IUIAutomationSelectionItemPattern>(
                        UIA_SelectionItemPatternId,
                    )
                    .ok()?,
                );
            }
        }
        matched
    }
}
