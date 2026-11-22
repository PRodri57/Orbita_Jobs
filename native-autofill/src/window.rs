use std::cell::RefCell;
use std::error::Error;
use std::path::PathBuf;

use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Gdi::*;
use windows::Win32::System::Com::{
    CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED, COINIT_DISABLE_OLE1DDE, CoCreateInstance,
    CoInitializeEx, CoTaskMemFree, CoUninitialize,
};
use windows::Win32::System::LibraryLoader::GetModuleHandleW;
use windows::Win32::System::Threading::CreateMutexW;
use windows::Win32::UI::Controls::DRAWITEMSTRUCT;
use windows::Win32::UI::HiDpi::{
    AdjustWindowRectExForDpi, DPI_AWARENESS_CONTEXT_SYSTEM_AWARE, GetDpiForSystem,
    SetProcessDpiAwarenessContext,
};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetFocus, SetFocus, UnregisterHotKey, VIRTUAL_KEY, VK_TAB,
};
use windows::Win32::UI::Shell::Common::COMDLG_FILTERSPEC;
use windows::Win32::UI::Shell::*;
use windows::Win32::UI::WindowsAndMessaging::*;
use windows::core::{PCWSTR, Result as WindowsResult, w};

use crate::browser::{self, Outcome};
use crate::form::Review;
use crate::profile::{
    self, COMPANY_MOTIVATION, MAX_VALUE_LENGTH, Profile, RESUME_PATH, RESUME_PATH_LIMIT, SECTIONS,
};
use crate::shortcut::Shortcut;
use crate::theme::{self, Theme, scaled};

const CLASS: PCWSTR = w!("OrbitaAutofillProfile");
const TITLE: PCWSTR = w!("Orbita Autofill");
const HOTKEY_IDS: [i32; 2] = [1, 2];
const TRAY: u32 = WM_APP + 1;
const SHOW_PROFILE: u32 = WM_APP + 2;
const FILL_RESULT: u32 = WM_APP + 3;
const EXIT_APP: u32 = WM_APP + 4;
const APPLICATION: usize = 3;
const SETTINGS: usize = SECTIONS.len();
const SECTION_NAMES: [&str; SETTINGS + 1] = [
    "Datos personales",
    "Enlaces y estudios",
    "Preferencias laborales",
    "Postulación",
    "Configuraciones",
];
const SECTION_BASE: usize = 100;
const SAVE: usize = 1;
const HIDE: usize = 2;
const EXIT: usize = 3;
const CHANGE_SHORTCUT: usize = 4;
const SECTION_TITLE: usize = 5;
const BACK_TO_PROFILE: usize = 6;
const CHOOSE_RESUME: usize = 7;
const SECTION_ICONS: [&str; SECTION_NAMES.len()] =
    ["\u{e77b}", "\u{e71b}", "\u{e821}", "\u{e8a5}", "\u{e713}"];
const EDIT_LIMIT: u32 = 0x00C5;
const PROFILE_STYLE: WINDOW_STYLE = WINDOW_STYLE(
    WS_OVERLAPPED.0 | WS_CAPTION.0 | WS_SYSMENU.0 | WS_MINIMIZEBOX.0 | WS_CLIPCHILDREN.0,
);

struct FieldControl {
    label: HWND,
    edit: HWND,
    frame: RECT,
    browse: Option<HWND>,
}

struct State {
    groups: Vec<Vec<FieldControl>>,
    current_section: usize,
    last_profile_section: usize,
    heading: HWND,
    hint: HWND,
    theme: Theme,
    buttons: Vec<HWND>,
    status: HWND,
    shortcut_label: HWND,
    shortcut_button: HWND,
    profile: Profile,
    path: PathBuf,
    saved: bool,
    busy: bool,
    tray: bool,
    tray_restart: u32,
    shortcut: Shortcut,
    active_hotkey: Option<i32>,
    capturing_shortcut: bool,
    dpi: i32,
    icon: HICON,
}

struct Instance(HANDLE);

impl Drop for Instance {
    fn drop(&mut self) {
        let _ = unsafe { CloseHandle(self.0) };
    }
}

pub fn run() -> Result<(), Box<dyn Error>> {
    unsafe {
        let lock = Instance(CreateMutexW(
            None,
            false,
            w!("Local\\OrbitaAutofillProfile"),
        )?);
        if GetLastError() == ERROR_ALREADY_EXISTS {
            let hwnd = FindWindowW(CLASS, PCWSTR::null())
                .map_err(|_| "Orbita Autofill ya se está iniciando.")?;
            let _ = PostMessageW(Some(hwnd), SHOW_PROFILE, WPARAM(0), LPARAM(0));
            return Ok(());
        }

        let _ = SetProcessDpiAwarenessContext(DPI_AWARENESS_CONTEXT_SYSTEM_AWARE);
        let dpi = GetDpiForSystem();
        let module: HINSTANCE = GetModuleHandleW(None)?.into();
        let icon = theme::logo(scaled(48, dpi as i32))?;
        let class = WNDCLASSW {
            hInstance: module,
            hCursor: LoadCursorW(None, IDC_ARROW)?,
            hIcon: icon,
            lpfnWndProc: Some(window_proc),
            lpszClassName: CLASS,
            ..Default::default()
        };
        if RegisterClassW(&class) == 0 {
            return Err(windows::core::Error::from_thread().into());
        }

        let path = profile::path()?;
        let loaded = profile::load(&path)
            .map_err(|error| format!("No se pudo abrir el perfil guardado. {error}"))?;
        let saved = loaded.is_some();
        let stored_shortcut = Shortcut::read(&path.with_file_name("shortcut.json"));
        let invalid_shortcut = stored_shortcut.is_err();
        let state = RefCell::new(State {
            groups: Vec::new(),
            current_section: 0,
            last_profile_section: 0,
            heading: HWND::default(),
            hint: HWND::default(),
            theme: Theme::new(dpi as i32),
            buttons: Vec::new(),
            status: HWND::default(),
            shortcut_label: HWND::default(),
            shortcut_button: HWND::default(),
            profile: loaded.unwrap_or_default(),
            path,
            saved,
            busy: false,
            tray: false,
            tray_restart: RegisterWindowMessageW(w!("TaskbarCreated")),
            shortcut: stored_shortcut.unwrap_or_default(),
            active_hotkey: None,
            capturing_shortcut: false,
            dpi: dpi as i32,
            icon,
        });
        let mut size = RECT {
            right: scaled(theme::WIDTH, dpi as i32),
            bottom: scaled(theme::HEIGHT, dpi as i32),
            ..Default::default()
        };
        AdjustWindowRectExForDpi(&mut size, PROFILE_STYLE, false, WINDOW_EX_STYLE(0), dpi)?;
        let window = CreateWindowExW(
            WINDOW_EX_STYLE(0),
            CLASS,
            TITLE,
            PROFILE_STYLE,
            CW_USEDEFAULT,
            CW_USEDEFAULT,
            size.right - size.left,
            size.bottom - size.top,
            None,
            None,
            Some(module),
            Some((&state as *const RefCell<State>).cast()),
        )?;
        theme::caption(window);
        let _ = ShowWindow(window, SW_SHOW);
        if invalid_shortcut {
            state
                .borrow()
                .status("No se pudo leer el atajo guardado. Se cargó el predeterminado.");
        }
        if let Some(first) = state.borrow().groups[0].first() {
            let _ = SetFocus(Some(first.edit));
        }
        let mut message = MSG::default();
        loop {
            match GetMessageW(&mut message, None, 0, 0).0 {
                0 => break,
                -1 => return Err(windows::core::Error::from_thread().into()),
                _ => {}
            }
            if matches!(message.message, WM_KEYDOWN | WM_SYSKEYDOWN)
                && state.borrow_mut().capture_key(window, &message)
            {
                continue;
            }
            if !IsDialogMessageW(window, &message).as_bool() {
                let _ = TranslateMessage(&message);
                DispatchMessageW(&message);
            }
        }
        drop(lock);
        let _ = UnregisterClassW(CLASS, Some(module));
        let _ = DestroyIcon(icon);
    }
    Ok(())
}

pub fn show_error(message: &str) {
    let text = wide(message);
    unsafe { MessageBoxW(None, PCWSTR(text.as_ptr()), TITLE, MB_OK | MB_ICONERROR) };
}

fn wide(text: &str) -> Vec<u16> {
    text.encode_utf16().chain([0]).collect()
}

fn resume_dialog(owner: HWND) -> WindowsResult<Option<String>> {
    unsafe {
        CoInitializeEx(None, COINIT_APARTMENTTHREADED | COINIT_DISABLE_OLE1DDE).ok()?;
        let result = (|| {
            let dialog: IFileOpenDialog =
                CoCreateInstance(&FileOpenDialog, None, CLSCTX_INPROC_SERVER)?;
            dialog.SetTitle(w!("Elegir archivo de CV"))?;
            dialog.SetOptions(
                dialog.GetOptions()?
                    | FOS_FORCEFILESYSTEM
                    | FOS_FILEMUSTEXIST
                    | FOS_NOCHANGEDIR
                    | FOS_DONTADDTORECENT,
            )?;
            dialog.SetFileTypes(&[COMDLG_FILTERSPEC {
                pszName: w!("Currículum (PDF, DOC, DOCX, TXT)"),
                pszSpec: w!("*.pdf;*.doc;*.docx;*.txt"),
            }])?;
            match dialog.Show(Some(owner)) {
                Err(error) if error.code() == ERROR_CANCELLED.to_hresult() => return Ok(None),
                result => result?,
            }
            let path = dialog.GetResult()?.GetDisplayName(SIGDN_FILESYSPATH)?;
            let result = path
                .to_string()
                .map_err(|_| windows::core::Error::from_hresult(E_INVALIDARG));
            CoTaskMemFree(Some(path.0.cast()));
            result.map(Some)
        })();
        CoUninitialize();
        result
    }
}

extern "system" fn window_proc(hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> LRESULT {
    unsafe {
        if matches!(
            msg,
            WM_CTLCOLOREDIT | WM_CTLCOLORSTATIC | WM_CTLCOLORLISTBOX
        ) {
            let dc = HDC(wparam.0 as *mut _);
            let edit = msg != WM_CTLCOLORSTATIC;
            let bg = if edit { theme::FIELD } else { theme::PANEL };
            let title = GetDlgCtrlID(HWND(lparam.0 as *mut _)) == SECTION_TITLE as i32;
            SetTextColor(
                dc,
                if edit || title {
                    theme::INK
                } else {
                    theme::MUTED
                },
            );
            SetBkColor(dc, bg);
            return LRESULT(theme::brush(dc, bg).0 as isize);
        }
        if msg == WM_NCCREATE {
            let params = &*(lparam.0 as *const CREATESTRUCTW);
            SetWindowLongPtrW(hwnd, GWLP_USERDATA, params.lpCreateParams as isize);
            return DefWindowProcW(hwnd, msg, wparam, lparam);
        }
        if msg == WM_NCDESTROY {
            SetWindowLongPtrW(hwnd, GWLP_USERDATA, 0);
        }
        if msg == EXIT_APP {
            let _ = DestroyWindow(hwnd);
            return LRESULT(0);
        }
        let state = GetWindowLongPtrW(hwnd, GWLP_USERDATA) as *const RefCell<State>;
        if let Some(state) = state.as_ref()
            && let Ok(mut state) = state.try_borrow_mut()
            && let Some(result) = state.handle(hwnd, msg, wparam, lparam)
        {
            return result;
        }
        DefWindowProcW(hwnd, msg, wparam, lparam)
    }
}

impl State {
    fn handle(&mut self, hwnd: HWND, msg: u32, wparam: WPARAM, lparam: LPARAM) -> Option<LRESULT> {
        unsafe {
            match msg {
                WM_ERASEBKGND => return Some(LRESULT(1)),
                WM_PAINT => {
                    let mut paint = PAINTSTRUCT::default();
                    let dc = BeginPaint(hwnd, &mut paint);
                    self.theme
                        .background(dc, self.icon, self.current_section == SETTINGS);
                    if let Some(group) = self.groups.get(self.current_section) {
                        let focus = GetFocus();
                        for field in group {
                            self.theme.field(
                                dc,
                                field.frame,
                                field.edit == focus || IsChild(field.edit, focus).as_bool(),
                            );
                        }
                    }
                    let _ = EndPaint(hwnd, &paint);
                }
                WM_DRAWITEM if lparam.0 != 0 => {
                    let item = &*(lparam.0 as *const DRAWITEMSTRUCT);
                    let id = item.CtlID as usize;
                    let symbol = id
                        .checked_sub(SECTION_BASE)
                        .and_then(|index| SECTION_ICONS.get(index))
                        .copied();
                    self.theme.button(
                        item,
                        symbol,
                        id == SECTION_BASE + self.current_section,
                        id == SAVE,
                    );
                    return Some(LRESULT(1));
                }
                WM_CREATE => {
                    if let Err(error) = self.create_controls(hwnd) {
                        show_error(&format!("No se pudo crear la ventana. {error}"));
                        return Some(LRESULT(-1));
                    }
                    self.add_tray_icon(hwnd);
                    self.update_hotkey(hwnd);
                }
                WM_COMMAND if wparam.0 >> 16 == BN_CLICKED as usize => match wparam.0 & 0xffff {
                    SAVE => {
                        if self.save(hwnd)
                            && (self.active_hotkey.is_some() || self.profile.is_empty())
                        {
                            self.hide(hwnd, true);
                        }
                    }
                    HIDE => self.hide(hwnd, false),
                    BACK_TO_PROFILE => self.show_section(hwnd, self.last_profile_section),
                    CHANGE_SHORTCUT => self.toggle_capture(),
                    CHOOSE_RESUME if self.current_section == APPLICATION => {
                        self.choose_resume(hwnd)
                    }
                    EXIT => {
                        // DestroyWindow sends WM_DESTROY synchronously. Release the state borrow first.
                        let _ = PostMessageW(Some(hwnd), EXIT_APP, WPARAM(0), LPARAM(0));
                    }
                    id if (SECTION_BASE..SECTION_BASE + SECTION_NAMES.len()).contains(&id) => {
                        self.show_section(hwnd, id - SECTION_BASE);
                    }
                    _ => return None,
                },
                WM_COMMAND
                    if matches!(
                        (wparam.0 >> 16) as u32,
                        EN_SETFOCUS | EN_KILLFOCUS | CBN_SETFOCUS | CBN_KILLFOCUS
                    ) =>
                {
                    if let Some(field) = self.groups.get(self.current_section).and_then(|fields| {
                        fields
                            .iter()
                            .find(|field| field.edit.0 as isize == lparam.0)
                    }) {
                        let _ = InvalidateRect(Some(hwnd), Some(&field.frame), false);
                    }
                }
                WM_COMMAND
                    if (wparam.0 & 0xffff) == CHANGE_SHORTCUT
                        && (wparam.0 >> 16) == BN_KILLFOCUS as usize =>
                {
                    self.cancel_capture();
                }
                WM_ACTIVATE if (wparam.0 & 0xffff) == WA_INACTIVE as usize => self.cancel_capture(),
                WM_CLOSE => self.hide(hwnd, false),
                WM_HOTKEY
                    if self.active_hotkey == Some(wparam.0 as i32)
                        && self.shortcut.matches_event(lparam.0) =>
                {
                    if self.capturing_shortcut && GetForegroundWindow() == hwnd {
                        self.end_capture();
                        self.status(&format!("El atajo ya es {}.", self.shortcut.label()));
                    } else {
                        self.start_fill(hwnd);
                    }
                }
                SHOW_PROFILE => self.show(hwnd),
                TRAY => match lparam.0 as u32 {
                    WM_LBUTTONUP => self.show(hwnd),
                    WM_RBUTTONUP | WM_CONTEXTMENU => self.tray_menu(hwnd),
                    _ => {}
                },
                FILL_RESULT => {
                    self.busy = false;
                    let message = match wparam.0 {
                        1 => "Hacé clic dentro del formulario en Firefox y volvé a usar el atajo."
                            .into(),
                        2 => "Windows no pudo acceder a los campos del formulario.".into(),
                        3 => {
                            let packed = lparam.0 as usize;
                            let changed = packed & 0xffff;
                            let existing = (packed >> 16) & 0xffff;
                            let failed = (packed >> 32) & 0xffff;
                            let review = Review::labels((packed >> 48) as u16);
                            let mut message =
                                format!("Completados {changed} · Con datos {existing}");
                            if failed > 0 {
                                message.push_str(&format!(" · Sin completar {failed}"));
                            }
                            if !review.is_empty() {
                                message.push_str(&format!(". Revisá {review}."));
                            }
                            message
                        }
                        _ => return Some(LRESULT(0)),
                    };
                    self.notify(hwnd, &message);
                }
                msg if msg == self.tray_restart && self.tray_restart != 0 => {
                    self.add_tray_icon(hwnd)
                }
                WM_DESTROY => {
                    if let Some(id) = self.active_hotkey.take() {
                        let _ = UnregisterHotKey(Some(hwnd), id);
                    }
                    let _ = Shell_NotifyIconW(NIM_DELETE, &self.icon_data(hwnd));
                    PostQuitMessage(0);
                }
                _ => return None,
            }
            Some(LRESULT(0))
        }
    }

    fn create_controls(&mut self, hwnd: HWND) -> WindowsResult<()> {
        for (index, title) in SECTION_NAMES.into_iter().enumerate() {
            let mut button = Control::button(
                title,
                SECTION_BASE + index,
                10,
                if index == SETTINGS {
                    526
                } else {
                    121 + index as i32 * 43
                },
                theme::RAIL - 20,
            );
            button.height = 39;
            self.buttons.push(self.control(hwnd, button)?);
        }

        let left = theme::LEFT;
        let width = theme::RIGHT - left;
        let mut heading = Control::label(SECTION_NAMES[0], left, 39, width);
        heading.id = Some(SECTION_TITLE);
        heading.height = 40;
        self.heading = self.control(hwnd, heading)?;
        self.hint = self.control(
            hwnd,
            Control::label(
                "Completá solo los datos que querés usar en tus postulaciones.",
                left,
                83,
                width,
            ),
        )?;
        let column = (width - 18) / 2;
        for (index, fields) in SECTIONS.iter().enumerate() {
            let mut slot = 0;
            let mut group = Vec::new();
            for field in *fields {
                let is_resume = field.key == RESUME_PATH;
                let wide_field = field.multiline || is_resume;
                if wide_field && slot % 2 != 0 {
                    slot += 1;
                }
                let x = left + (slot % 2) * (column + 18);
                let y = 110 + (slot / 2) * 54;
                let w = if wide_field { width } else { column };
                let h = if field.key == COMPANY_MOTIVATION {
                    124
                } else if field.multiline {
                    64
                } else {
                    30
                };
                let label = self.control(hwnd, Control::label(field.label, x, y, w).hidden())?;
                let value = profile::editor_value(field.key, self.profile.get(field.key))
                    .replace('\n', "\r\n");
                let editor_width = if is_resume { w - 128 } else { w };
                let edit = if field.choices.is_empty() {
                    let edit = self.control(
                        hwnd,
                        Control::edit(
                            &value,
                            x + 8,
                            y + 26,
                            editor_width - 16,
                            h - 9,
                            field.multiline,
                        )
                        .hidden(),
                    )?;
                    let limit = if is_resume {
                        RESUME_PATH_LIMIT
                    } else {
                        MAX_VALUE_LENGTH
                    };
                    unsafe { SendMessageW(edit, EDIT_LIMIT, Some(WPARAM(limit)), None) };
                    edit
                } else {
                    let combo =
                        self.control(hwnd, Control::combo(x + 1, y + 22, w - 2).hidden())?;
                    theme::style_combo(combo, self.dpi);
                    unsafe {
                        SendMessageW(combo, CB_LIMITTEXT, Some(WPARAM(MAX_VALUE_LENGTH)), None);
                        SendMessageW(
                            combo,
                            CB_SETITEMHEIGHT,
                            Some(WPARAM(usize::MAX)),
                            Some(LPARAM(scaled(24, self.dpi) as isize)),
                        );
                        for choice in field.choices {
                            let item = wide(choice);
                            let result = SendMessageW(
                                combo,
                                CB_ADDSTRING,
                                None,
                                Some(LPARAM(item.as_ptr() as isize)),
                            );
                            if result.0 < 0 {
                                return Err(windows::core::Error::from_hresult(E_OUTOFMEMORY));
                            }
                        }
                        SetWindowTextW(combo, PCWSTR(wide(&value).as_ptr()))?;
                    }
                    combo
                };
                let browse = if is_resume {
                    Some(
                        self.control(
                            hwnd,
                            Control::button("Elegir CV…", CHOOSE_RESUME, x + w - 116, y + 19, 116)
                                .hidden(),
                        )?,
                    )
                } else {
                    None
                };
                group.push(FieldControl {
                    label,
                    edit,
                    frame: self.theme.rect(x, y + 21, editor_width, h),
                    browse,
                });
                slot += if wide_field { 2 } else { 1 };
            }
            self.groups.insert(index, group);
        }

        self.shortcut_label =
            self.control(hwnd, Control::label("", left, 145, width - 158).hidden())?;
        self.shortcut_button = self.control(
            hwnd,
            Control::button(
                "Cambiar atajo",
                CHANGE_SHORTCUT,
                theme::RIGHT - 143,
                136,
                143,
            )
            .notifies_focus()
            .hidden(),
        )?;
        self.show_shortcut();
        let mut status = Control::label("", left, 469, width);
        status.height = 40;
        self.status = self.control(hwnd, status)?;
        self.control(
            hwnd,
            Control::button("Guardar y minimizar", SAVE, theme::RIGHT - 179, 528, 179),
        )?;
        self.control(
            hwnd,
            Control::button(
                "Volver al perfil",
                BACK_TO_PROFILE,
                theme::RIGHT - 179,
                528,
                179,
            )
            .hidden(),
        )?;
        self.control(
            hwnd,
            Control::button("Minimizar", HIDE, theme::RIGHT - 297, 528, 108),
        )?;
        self.control(hwnd, Control::button("Salir", EXIT, left, 528, 66))?;
        self.show_section(hwnd, 0);
        Ok(())
    }

    fn control(&self, hwnd: HWND, control: Control<'_>) -> WindowsResult<HWND> {
        let text = wide(control.text);
        let s = |value| scaled(value, self.dpi);
        unsafe {
            let handle = CreateWindowExW(
                control.ex_style,
                control.class,
                PCWSTR(text.as_ptr()),
                control.style | WS_CHILD,
                s(control.x),
                s(control.y),
                s(control.width),
                s(control.height),
                Some(hwnd),
                control.id.map(|id| HMENU(id as *mut _)),
                None,
                None,
            )?;
            let font = if control.id == Some(SECTION_TITLE) {
                self.theme.title
            } else {
                self.theme.body
            };
            SendMessageW(
                handle,
                WM_SETFONT,
                Some(WPARAM(font.0 as usize)),
                Some(LPARAM(1)),
            );
            Ok(handle)
        }
    }

    fn show_section(&mut self, hwnd: HWND, index: usize) {
        unsafe {
            self.cancel_capture();
            let settings = index == SETTINGS;
            if !settings {
                self.last_profile_section = index;
            }
            self.current_section = index;
            let _ = SetWindowTextW(self.heading, PCWSTR(wide(SECTION_NAMES[index]).as_ptr()));
            let hint = match index {
                SETTINGS => {
                    w!("Elegí el atajo que vas a usar para completar formularios en Firefox.")
                }
                APPLICATION => {
                    w!("Guardá estos datos para revisarlos antes de enviar cada postulación.")
                }
                _ => w!("Completá solo los datos que querés usar en tus postulaciones."),
            };
            let _ = SetWindowTextW(self.hint, hint);
            let settings_visibility = if settings { SW_SHOWNA } else { SW_HIDE };
            for control in [self.shortcut_label, self.shortcut_button] {
                let _ = ShowWindow(control, settings_visibility);
            }
            if let Ok(back) = GetDlgItem(Some(hwnd), BACK_TO_PROFILE as i32) {
                let _ = ShowWindow(back, settings_visibility);
            }
            if let Ok(save) = GetDlgItem(Some(hwnd), SAVE as i32) {
                let _ = ShowWindow(save, if settings { SW_HIDE } else { SW_SHOWNA });
            }
            let _ = SetWindowPos(
                self.status,
                None,
                scaled(theme::LEFT, self.dpi),
                scaled(if settings { 185 } else { 464 }, self.dpi),
                0,
                0,
                SWP_NOSIZE | SWP_NOZORDER | SWP_NOACTIVATE,
            );
            for (group_index, fields) in self.groups.iter().enumerate() {
                let active = group_index == index;
                for field in fields {
                    let visibility = if active { SW_SHOWNA } else { SW_HIDE };
                    let _ = ShowWindow(field.label, visibility);
                    let _ = ShowWindow(field.edit, visibility);
                    if let Some(browse) = field.browse {
                        let _ = ShowWindow(browse, visibility);
                    }
                }
            }
            for button in &self.buttons {
                let _ = InvalidateRect(Some(*button), None, false);
            }
            let focus = self
                .groups
                .get(index)
                .and_then(|group| group.first())
                .map_or(self.shortcut_button, |first| first.edit);
            let _ = SetFocus(Some(focus));
            let _ = InvalidateRect(Some(hwnd), None, false);
        }
    }

    fn choose_resume(&self, hwnd: HWND) {
        let Some(control) = self.groups[APPLICATION]
            .iter()
            .find(|control| control.browse.is_some())
        else {
            return;
        };
        match resume_dialog(hwnd) {
            Ok(Some(path)) if profile::is_resume_path(&path) => {
                match unsafe { SetWindowTextW(control.edit, PCWSTR(wide(&path).as_ptr())) } {
                    Ok(()) => self
                        .status("CV seleccionado. Guardá el perfil para conservar su ubicación."),
                    Err(error) => {
                        self.status(&format!("No se pudo cargar la ruta del CV. {error}"))
                    }
                }
            }
            Ok(Some(_)) => self.status("Elegí un archivo de CV en formato PDF, DOC, DOCX o TXT."),
            Ok(None) => {}
            Err(error) => self.status(&format!("No se pudo abrir el selector de CV. {error}")),
        }
    }

    fn save(&mut self, hwnd: HWND) -> bool {
        let mut profile = self.profile.clone();
        for (section, (fields, controls)) in SECTIONS.iter().zip(&self.groups).enumerate() {
            for (field, control) in fields.iter().zip(controls) {
                let mut text =
                    vec![0u16; unsafe { GetWindowTextLengthW(control.edit) } as usize + 1];
                let length = unsafe { GetWindowTextW(control.edit, &mut text) } as usize;
                let cleaned = String::from_utf16_lossy(&text[..length]);
                match profile::value_from_editor(field, &cleaned) {
                    Ok(Some(value)) => {
                        profile.insert(field.key.into(), value);
                    }
                    Ok(None) => {
                        profile.remove(field.key);
                    }
                    Err(error) => {
                        let edit = control.edit;
                        self.show_section(hwnd, section);
                        let _ = unsafe { SetFocus(Some(edit)) };
                        self.status(&format!("{}. {error}", field.label.trim_end_matches('?')));
                        return false;
                    }
                }
            }
        }
        match profile::save(&self.path, &profile) {
            Ok(()) => {
                self.profile = profile;
                self.saved = true;
                self.update_hotkey(hwnd);
                true
            }
            Err(error) => {
                show_error(&format!("No se pudo guardar el perfil. {error}"));
                false
            }
        }
    }

    fn update_hotkey(&mut self, hwnd: HWND) {
        if self.profile.is_empty() {
            if let Some(id) = self.active_hotkey.take() {
                let _ = unsafe { UnregisterHotKey(Some(hwnd), id) };
            }
        } else if self.active_hotkey.is_none() {
            let id = HOTKEY_IDS[0];
            self.active_hotkey = self.shortcut.register(hwnd, id).is_ok().then_some(id);
        }
        self.shortcut_status();
    }

    fn shortcut_status(&self) {
        let shortcut = self.shortcut.label();
        let message = if self.profile.is_empty() {
            format!("Completá y guardá al menos un dato para activar {shortcut}.")
        } else if self.active_hotkey.is_some() {
            format!("Usá {shortcut} dentro del formulario de Firefox.")
        } else {
            format!(
                "Windows no pudo activar {shortcut}. Elegí otro atajo o volvé a guardar el perfil."
            )
        };
        self.status(&message);
    }

    fn show_shortcut(&self) {
        let summary = format!("Atajo de autocompletado   {}", self.shortcut.label());
        let _ = unsafe { SetWindowTextW(self.shortcut_label, PCWSTR(wide(&summary).as_ptr())) };
    }

    fn toggle_capture(&mut self) {
        if self.capturing_shortcut {
            self.cancel_capture();
        } else {
            self.capturing_shortcut = true;
            unsafe {
                let _ = SetFocus(Some(self.shortcut_button));
                let _ = SetWindowTextW(self.shortcut_button, w!("Cancelar cambio"));
            }
            self.status("Presioná una combinación o una tecla de función. Esc cancela.");
        }
    }

    fn end_capture(&mut self) {
        self.capturing_shortcut = false;
        let _ = unsafe { SetWindowTextW(self.shortcut_button, w!("Cambiar atajo")) };
    }

    fn cancel_capture(&mut self) {
        if self.capturing_shortcut {
            self.end_capture();
            self.shortcut_status();
        }
    }

    fn capture_key(&mut self, hwnd: HWND, message: &MSG) -> bool {
        if !self.capturing_shortcut
            || message.hwnd != self.shortcut_button
            || !unsafe { GetForegroundWindow() == hwnd && GetFocus() == self.shortcut_button }
        {
            return false;
        }
        let key = VIRTUAL_KEY(message.wParam.0 as u16);
        if Shortcut::is_modifier(key) || message.lParam.0 & (1 << 30) != 0 {
            return true;
        }
        let shortcut = Shortcut::from_keyboard(key);
        if shortcut.cancels_capture() {
            self.cancel_capture();
            return key != VK_TAB;
        }
        if let Err(error) = shortcut.validate() {
            self.status(error);
        } else {
            self.set_shortcut(hwnd, shortcut);
        }
        true
    }

    fn set_shortcut(&mut self, hwnd: HWND, shortcut: Shortcut) {
        if shortcut == self.shortcut && self.active_hotkey.is_some() {
            self.end_capture();
            self.shortcut_status();
            return;
        }

        // Windows allows multiple registrations per window. Keep the old binding until the new one is saved.
        let id = if self.active_hotkey == Some(HOTKEY_IDS[0]) {
            HOTKEY_IDS[1]
        } else {
            HOTKEY_IDS[0]
        };
        let label = shortcut.label();
        if shortcut.register(hwnd, id).is_err() {
            self.status(&format!("Windows no pudo registrar {label}. Puede estar ocupado o reservado. Probá con otro."));
            return;
        }
        if let Err(error) = shortcut.save(&self.path.with_file_name("shortcut.json")) {
            let _ = unsafe { UnregisterHotKey(Some(hwnd), id) };
            self.status(&format!("No se pudo guardar el nuevo atajo. {error}"));
            return;
        }
        if let Some(previous) = self.active_hotkey.take() {
            let _ = unsafe { UnregisterHotKey(Some(hwnd), previous) };
        }
        if self.profile.is_empty() {
            let _ = unsafe { UnregisterHotKey(Some(hwnd), id) };
        } else {
            self.active_hotkey = Some(id);
        }
        self.shortcut = shortcut;
        self.end_capture();
        self.show_shortcut();
        self.shortcut_status();
    }

    fn start_fill(&mut self, hwnd: HWND) {
        let foreground = unsafe { GetForegroundWindow() };
        if self.busy || !self.saved || self.profile.is_empty() || !browser::is_firefox(foreground) {
            return;
        }
        let profile = self.profile.clone();
        let foreground = foreground.0 as usize;
        let window = hwnd.0 as usize;
        let task = std::thread::Builder::new()
            .name("firefox-accessibility".into())
            .spawn(move || {
                let (code, counts) = match browser::fill(HWND(foreground as *mut _), &profile) {
                    Outcome::OutsideFirefox => (0, 0),
                    Outcome::NoDocument => (1, 0),
                    Outcome::Unavailable => (2, 0),
                    Outcome::Filled {
                        changed,
                        existing,
                        failed,
                        review,
                    } => (
                        3,
                        changed.min(0xffff)
                            | (existing.min(0xffff) << 16)
                            | (failed.min(0xffff) << 32)
                            | (usize::from(review) << 48),
                    ),
                };
                let _ = unsafe {
                    PostMessageW(
                        Some(HWND(window as *mut _)),
                        FILL_RESULT,
                        WPARAM(code),
                        LPARAM(counts as isize),
                    )
                };
            });
        self.busy = task.is_ok();
        if !self.busy {
            self.notify(hwnd, "No se pudo iniciar el autocompletado.");
        }
    }

    fn show(&self, hwnd: HWND) {
        unsafe {
            let _ = ShowWindow(hwnd, SW_RESTORE);
            let _ = SetForegroundWindow(hwnd);
        }
    }

    fn hide(&self, hwnd: HWND, after_save: bool) {
        unsafe {
            let _ = ShowWindow(hwnd, if self.tray { SW_HIDE } else { SW_MINIMIZE });
        }
        if after_save && self.active_hotkey.is_some() {
            self.notify(
                hwnd,
                &format!(
                    "Perfil guardado. Hacé clic dentro del formulario y presioná {}.",
                    self.shortcut.label()
                ),
            );
        }
    }

    fn status(&self, text: &str) {
        let _ = unsafe { SetWindowTextW(self.status, PCWSTR(wide(text).as_ptr())) };
    }

    fn icon_data(&self, hwnd: HWND) -> NOTIFYICONDATAW {
        NOTIFYICONDATAW {
            cbSize: std::mem::size_of::<NOTIFYICONDATAW>() as u32,
            hWnd: hwnd,
            uID: 1,
            ..Default::default()
        }
    }

    fn add_tray_icon(&mut self, hwnd: HWND) {
        let mut icon = self.icon_data(hwnd);
        icon.uFlags = NIF_ICON | NIF_MESSAGE | NIF_TIP;
        icon.hIcon = self.icon;
        icon.uCallbackMessage = TRAY;
        copy_wide(&mut icon.szTip, "Orbita Autofill");
        self.tray = unsafe { Shell_NotifyIconW(NIM_ADD, &icon) }.as_bool();
        if !self.tray && !unsafe { IsWindowVisible(hwnd) }.as_bool() {
            let _ = unsafe { ShowWindow(hwnd, SW_SHOWMINNOACTIVE) };
        }
    }

    fn notify(&self, hwnd: HWND, message: &str) {
        self.status(message);
        if self.tray {
            let mut icon = self.icon_data(hwnd);
            icon.uFlags = NIF_INFO;
            icon.dwInfoFlags = NIIF_INFO;
            copy_wide(&mut icon.szInfoTitle, "Orbita Autofill");
            copy_wide(&mut icon.szInfo, message);
            let _ = unsafe { Shell_NotifyIconW(NIM_MODIFY, &icon) };
        }
    }

    fn tray_menu(&self, hwnd: HWND) {
        unsafe {
            let Ok(menu) = CreatePopupMenu() else { return };
            let _ = AppendMenuW(menu, MF_STRING, 1, w!("Editar perfil"));
            let _ = AppendMenuW(menu, MF_STRING, 2, w!("Salir"));
            let mut point = POINT::default();
            if GetCursorPos(&mut point).is_ok() {
                let _ = SetForegroundWindow(hwnd);
                let picked = TrackPopupMenu(
                    menu,
                    TPM_RETURNCMD | TPM_RIGHTBUTTON,
                    point.x,
                    point.y,
                    None,
                    hwnd,
                    None,
                );
                match picked.0 {
                    1 => self.show(hwnd),
                    2 => {
                        let _ = PostMessageW(Some(hwnd), EXIT_APP, WPARAM(0), LPARAM(0));
                    }
                    _ => {}
                }
                let _ = PostMessageW(Some(hwnd), WM_NULL, WPARAM(0), LPARAM(0));
            }
            let _ = DestroyMenu(menu);
        }
    }
}

fn copy_wide(target: &mut [u16], text: &str) {
    let capacity = target.len() - 1;
    for (dest, ch) in target[..capacity].iter_mut().zip(text.encode_utf16()) {
        *dest = ch;
    }
}

struct Control<'a> {
    class: PCWSTR,
    text: &'a str,
    style: WINDOW_STYLE,
    ex_style: WINDOW_EX_STYLE,
    x: i32,
    y: i32,
    width: i32,
    height: i32,
    id: Option<usize>,
}

impl<'a> Control<'a> {
    fn label(text: &'a str, x: i32, y: i32, width: i32) -> Self {
        Self {
            class: w!("STATIC"),
            text,
            style: WS_VISIBLE,
            ex_style: WINDOW_EX_STYLE(0),
            x,
            y,
            width,
            height: 20,
            id: None,
        }
    }

    fn edit(text: &'a str, x: i32, y: i32, width: i32, height: i32, multiline: bool) -> Self {
        let style = if multiline {
            WINDOW_STYLE((ES_MULTILINE | ES_AUTOVSCROLL | ES_WANTRETURN) as u32) | WS_VSCROLL
        } else {
            WINDOW_STYLE(ES_AUTOHSCROLL as u32)
        };
        Self {
            class: w!("EDIT"),
            text,
            style: WS_TABSTOP | WS_VISIBLE | style,
            ex_style: WINDOW_EX_STYLE(0),
            x,
            y,
            width,
            height,
            id: None,
        }
    }

    fn combo(x: i32, y: i32, width: i32) -> Self {
        Self {
            class: w!("COMBOBOX"),
            text: "",
            style: WS_VISIBLE
                | WS_TABSTOP
                | WS_VSCROLL
                | WINDOW_STYLE((CBS_DROPDOWN | CBS_AUTOHSCROLL) as u32),
            ex_style: WINDOW_EX_STYLE(0),
            x,
            y,
            width,
            height: 204,
            id: None,
        }
    }

    fn button(text: &'a str, id: usize, x: i32, y: i32, width: i32) -> Self {
        Self {
            class: w!("BUTTON"),
            text,
            style: WS_VISIBLE | WS_TABSTOP | WINDOW_STYLE(BS_OWNERDRAW as u32),
            ex_style: WINDOW_EX_STYLE(0),
            x,
            y,
            width,
            height: 34,
            id: Some(id),
        }
    }

    fn hidden(mut self) -> Self {
        self.style &= !WS_VISIBLE;
        self
    }

    fn notifies_focus(mut self) -> Self {
        self.style |= WINDOW_STYLE(BS_NOTIFY as u32);
        self
    }
}
