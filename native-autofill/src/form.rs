use crate::profile::{identify, normalize_label};

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Control {
    Edit,
    Picker,
    CheckBox,
    Number,
    Radio,
    Button,
    Password,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Field {
    Text(&'static str),
    Location,
    Experience,
    Remote,
    Manual(Review),
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[repr(u16)]
pub enum Review {
    Location = 1 << 0,
    Experience = 1 << 1,
    Remote = 1 << 2,
    Salary = 1 << 3,
    WorkAuthorization = 1 << 4,
    Sponsorship = 1 << 5,
    CompanyQuestion = 1 << 6,
    Account = 1 << 7,
    Resume = 1 << 8,
}

impl Review {
    pub fn labels(mask: u16) -> String {
        [
            (Self::Location, "ubicación"),
            (Self::Experience, "experiencia"),
            (Self::Remote, "remoto"),
            (Self::Salary, "salario"),
            (Self::WorkAuthorization, "permiso laboral"),
            (Self::Sponsorship, "visa"),
            (Self::CompanyQuestion, "pregunta de la empresa"),
            (Self::Account, "cuenta"),
            (Self::Resume, "CV"),
        ]
        .into_iter()
        .filter_map(|(item, label)| (mask & item as u16 != 0).then_some(label))
        .collect::<Vec<_>>()
        .join(", ")
    }
}

pub fn is_wellfound_job(url: &str) -> bool {
    [
        "https://wellfound.com/jobs/",
        "https://www.wellfound.com/jobs/",
    ]
    .iter()
    .any(|prefix| {
        url.strip_prefix(prefix)
            .is_some_and(|slug| !slug.is_empty())
    })
}

fn wellfound_field(control: Control, id: &str) -> Option<Field> {
    use Control::*;
    use Field::*;
    match (control, id) {
        (Edit | Picker, "react-select-form-input--yearsOfExperience-input") => Some(Experience),
        (CheckBox, "form-input--remote--true") => Some(Remote),
        (Number | Edit, "form-input--desiredSalary") => Some(Manual(Review::Salary)),
        (Radio, "form-input--usAuthorized--true" | "form-input--usAuthorized--false") => {
            Some(Manual(Review::WorkAuthorization))
        }
        (
            Radio,
            "form-input--requireSponsorship--true" | "form-input--requireSponsorship--false",
        ) => Some(Manual(Review::Sponsorship)),
        (Edit, id)
            if id.starts_with("form-input--customQuestionAnswers[")
                && id.ends_with("][answer]") =>
        {
            Some(Manual(Review::CompanyQuestion))
        }
        _ => None,
    }
}

fn manual_field(control: Control, label: &str) -> Option<Review> {
    let text = normalize_label(label);
    let starts_with = |prefixes: &[&str]| {
        prefixes.iter().any(|prefix| {
            text == *prefix
                || text
                    .strip_prefix(prefix)
                    .is_some_and(|rest| rest.starts_with(' '))
        })
    };
    match control {
        Control::Number | Control::Edit
            if starts_with(&[
                "desired salary",
                "salary expectation",
                "expected salary",
                "salary expectations",
                "pretension salarial",
                "salario esperado",
                "sueldo pretendido",
                "remuneracion pretendida",
            ]) =>
        {
            Some(Review::Salary)
        }
        Control::Radio
            if starts_with(&[
                "do you or will you require sponsorship",
                "will you require sponsorship",
                "do you require sponsorship",
                "do you now or in the future require sponsorship",
                "necesitas patrocinio",
                "requeris patrocinio",
                "requerira patrocinio",
            ]) =>
        {
            Some(Review::Sponsorship)
        }
        Control::Radio
            if starts_with(&[
                "are you legally authorized to work",
                "are you legally authorised to work",
                "are you authorized to work",
                "us work authorization",
                "autorizacion laboral",
                "estas autorizado para trabajar",
                "estas autorizada para trabajar",
            ]) =>
        {
            Some(Review::WorkAuthorization)
        }
        Control::Edit
            if starts_with(&[
                "what interests you about working for",
                "why do you want to work",
                "why are you interested in working",
                "que te interesa de trabajar",
                "por que queres trabajar",
                "por que quieres trabajar",
            ]) =>
        {
            Some(Review::CompanyQuestion)
        }
        Control::Button
            if starts_with(&[
                "drag to upload your resume",
                "upload a recent resume",
                "upload your resume",
                "upload resume",
                "upload cv",
                "subi tu cv",
                "subir cv",
                "adjuntar cv",
            ]) =>
        {
            Some(Review::Resume)
        }
        _ => None,
    }
}

fn remote_label(label: &str) -> bool {
    matches!(
        normalize_label(label).as_str(),
        "i m open to work remotely"
            | "i am open to work remotely"
            | "open to remote work"
            | "i m open to remote work"
            | "estoy abierto a trabajar de forma remota"
            | "estoy abierta a trabajar de forma remota"
            | "acepto trabajar de forma remota"
    )
}

pub fn is_placeholder(text: &str) -> bool {
    let text = normalize_label(text);
    matches!(
        text.as_str(),
        "select"
            | "select one"
            | "select an option"
            | "please select"
            | "choose"
            | "choose one"
            | "choose an option"
            | "selecciona"
            | "seleccione"
            | "selecciona una opcion"
            | "elegi"
            | "elige"
            | "buscar"
            | "search"
    ) || text.starts_with("e g ")
        || text.starts_with("por ejemplo ")
}

fn picker_label(text: &str) -> Option<(&'static str, bool)> {
    if let Some((label, suffix)) = text.split_once('*') {
        return identify(label, "").map(|key| (key, is_placeholder(suffix)));
    }
    if let Some(key) = identify(text, "") {
        return Some((key, false));
    }
    let text = normalize_label(text);
    for (boundary, _) in text.match_indices(' ') {
        let (label, suffix) = text.split_at(boundary);
        if let Some(key) = identify(label, "")
            && is_placeholder(suffix)
        {
            return Some((key, true));
        }
    }
    None
}

pub fn picker_shows_placeholder(text: &str, key: &str) -> bool {
    picker_label(text) == Some((key, true))
}

pub fn labels_picker(text: &str, key: &str) -> bool {
    picker_label(text).is_some_and(|(found, _)| found == key)
}

pub fn classify(
    control: Control,
    name: &str,
    label: &str,
    groups: &[&str],
    wellfound_id: Option<&str>,
) -> Option<Field> {
    if control == Control::Password {
        return Some(Field::Manual(Review::Account));
    }
    let own = [name, label];
    let site_field = wellfound_id.and_then(|id| wellfound_field(control, id));
    if let Some(Field::Manual(review)) = site_field {
        return Some(Field::Manual(review));
    }
    if let Some(review) = own
        .into_iter()
        .chain(groups.iter().copied())
        .find_map(|text| manual_field(control, text))
    {
        return Some(Field::Manual(review));
    }
    if control == Control::CheckBox
        && (site_field == Some(Field::Remote) || own.into_iter().any(remote_label))
    {
        return Some(Field::Remote);
    }

    if matches!(control, Control::Picker | Control::Edit) {
        let local_picker = own
            .into_iter()
            .chain(groups.iter().copied())
            .find_map(picker_label);
        if control == Control::Picker
            || local_picker.is_some_and(|(_, placeholder)| placeholder)
            || site_field == Some(Field::Experience)
        {
            let key = match site_field {
                Some(Field::Experience) => Some("experience"),
                _ => local_picker.map(|(key, _)| key),
            };
            // A nearby label can clarify an unlabeled search box, but never override its own field label.
            if let Some(key @ ("location" | "experience")) = key
                && own.into_iter().all(|text| {
                    text.trim().is_empty()
                        || is_placeholder(text)
                        || picker_label(text).is_some_and(|(found, _)| found == key)
                })
            {
                return Some(if key == "location" {
                    Field::Location
                } else {
                    Field::Experience
                });
            }
        }
        if control == Control::Edit {
            return identify(name, label).map(Field::Text);
        }
    }
    None
}

pub fn experience_years(text: &str) -> Option<u16> {
    let original = text.trim();
    if text.contains('+') {
        return None;
    }
    let text = normalize_label(text);
    if matches!(
        text.as_str(),
        "no experience" | "sin experiencia" | "no professional experience"
    ) {
        return Some(0);
    }
    let (number, suffix) = text.split_once(' ').unwrap_or((&text, ""));
    if !matches!(
        suffix,
        "" | "year" | "years" | "ano" | "anos" | "years of experience" | "anos de experiencia"
    ) {
        return None;
    }
    // Reject ranges and signed or fractional values even if punctuation was normalized.
    if !original.chars().next()?.is_ascii_digit() {
        return None;
    }
    number.parse().ok()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn finds_wellfound_controls_in_labels_groups_and_ids() {
        assert_eq!(
            classify(Control::Edit, "Full Name*", "", &[], None),
            Some(Field::Text("full_name"))
        );
        assert_eq!(
            classify(
                Control::Picker,
                "e.g. San Francisco",
                "",
                &["Set Your Location* e.g. San Francisco"],
                None
            ),
            Some(Field::Location)
        );
        assert_eq!(
            classify(
                Control::Picker,
                "",
                "",
                &["Years of experience* Select"],
                None
            ),
            Some(Field::Experience)
        );
        assert!(picker_shows_placeholder(
            "Years of experience* Select",
            "experience"
        ));
        assert!(!picker_shows_placeholder(
            "Years of experience* 3 years",
            "experience"
        ));
        assert!(picker_shows_placeholder(
            "Años de experiencia Seleccioná una opción",
            "experience"
        ));
        assert_eq!(
            classify(
                Control::CheckBox,
                "I'm open to work remotely",
                "",
                &[],
                None
            ),
            Some(Field::Remote)
        );
        assert_eq!(
            classify(Control::Number, "Desired Salary*", "", &[], None),
            Some(Field::Manual(Review::Salary))
        );
        assert_eq!(
            classify(Control::Password, "", "", &[], None),
            Some(Field::Manual(Review::Account))
        );
        assert_eq!(
            classify(
                Control::Radio,
                "Yes",
                "",
                &["US work authorization *"],
                Some("form-input--requireSponsorship--true")
            ),
            Some(Field::Manual(Review::Sponsorship))
        );
        assert_eq!(
            classify(
                Control::Radio,
                "No",
                "",
                &[],
                Some("form-input--usAuthorized--false")
            ),
            Some(Field::Manual(Review::WorkAuthorization))
        );
        assert_eq!(
            classify(
                Control::Edit,
                "",
                "",
                &["What interests you about working for this company?"],
                None
            ),
            Some(Field::Manual(Review::CompanyQuestion))
        );
        assert_eq!(
            classify(
                Control::Button,
                "Drag to upload your resume, or browse",
                "",
                &[],
                None
            ),
            Some(Field::Manual(Review::Resume))
        );
        assert_eq!(
            classify(Control::Button, "Submit application", "", &[], None),
            None
        );
        assert_eq!(
            classify(Control::Edit, "Search", "", &[], Some("downshift-0-input")),
            None
        );
    }

    #[test]
    fn ignores_conflicting_labels_and_requires_an_exact_year_count() {
        assert_eq!(
            classify(
                Control::Picker,
                "Company",
                "",
                &["Set Your Location* e.g. San Francisco"],
                None
            ),
            None
        );
        assert!(!is_wellfound_job(
            "https://wellfound.com.example.invalid/jobs/123"
        ));
        assert!(is_wellfound_job("https://wellfound.com/jobs/123"));
        assert_eq!(experience_years("3 years"), Some(3));
        assert_eq!(experience_years("Sin experiencia"), Some(0));
        for option in [
            "3+ years",
            "3-5 years",
            "3.5 years",
            "-3",
            "At least 3 years",
        ] {
            assert_eq!(experience_years(option), None);
        }
    }
}
