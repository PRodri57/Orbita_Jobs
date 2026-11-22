use std::collections::BTreeMap;
use std::fs;
use std::io::{self, Write};
use std::path::{Path, PathBuf};

use windows::Win32::Foundation::{HLOCAL, LocalFree};
use windows::Win32::Security::Cryptography::{
    CRYPT_INTEGER_BLOB, CRYPTPROTECT_UI_FORBIDDEN, CryptProtectData, CryptUnprotectData,
};
use windows::core::{PCWSTR, Result as WindowsResult};

pub const MAX_VALUE_LENGTH: usize = 2_000;
pub const RESUME_PATH: &str = "resume_path";
pub const RESUME_PATH_LIMIT: usize = 32_767;
pub const COMPANY_MOTIVATION: &str = "company_motivation";
const SALARY: &str = "desired_salary_usd";
const SALARY_PERIOD: &str = "salary_period";
const US_AUTHORIZATION: &str = "us_work_authorization";
const US_SPONSORSHIP: &str = "us_visa_sponsorship";
const UNSPECIFIED: &str = "Sin indicar";
const YES_NO: &[&str] = &[UNSPECIFIED, "Sí", "No"];
const PAY_PERIODS: &[&str] = &[UNSPECIFIED, "Por hora", "Mensual", "Anual"];
pub type Profile = BTreeMap<String, String>;

pub struct Field {
    pub key: &'static str,
    pub label: &'static str,
    aliases: &'static [&'static str],
    pub multiline: bool,
    pub choices: &'static [&'static str],
}

impl Field {
    const fn new(key: &'static str, label: &'static str, aliases: &'static [&'static str]) -> Self {
        Self {
            key,
            label,
            aliases,
            multiline: false,
            choices: &[],
        }
    }

    const fn multiline(mut self) -> Self {
        self.multiline = true;
        self
    }

    const fn choices(mut self, choices: &'static [&'static str]) -> Self {
        self.choices = choices;
        self
    }
}

pub const SECTIONS: &[&[Field]] = &[
    &[
        Field::new(
            "first_name",
            "Nombre de pila",
            &[
                "first name",
                "given name",
                "nombre de pila",
                "primer nombre",
                "nombres",
            ],
        ),
        Field::new(
            "middle_name",
            "Segundo nombre",
            &["middle name", "additional name", "segundo nombre"],
        ),
        Field::new(
            "last_name",
            "Apellido",
            &[
                "last name",
                "surname",
                "family name",
                "apellido",
                "apellidos",
            ],
        ),
        Field::new(
            "full_name",
            "Nombre completo",
            &[
                "name",
                "full name",
                "candidate name",
                "applicant name",
                "legal name",
                "your name",
                "nombre",
                "nombre completo",
                "nombre y apellido",
                "nombre del candidato",
            ],
        ),
        Field::new(
            "email",
            "Correo electrónico",
            &[
                "email",
                "e mail",
                "email address",
                "your email",
                "correo",
                "correo electronico",
                "direccion de correo",
                "direccion de correo electronico",
            ],
        ),
        Field::new(
            "phone",
            "Teléfono",
            &[
                "phone",
                "phone number",
                "telephone",
                "mobile",
                "mobile number",
                "telefono",
                "celular",
                "numero de telefono",
                "telefono de contacto",
            ],
        ),
        Field::new("city", "Ciudad", &["city", "town", "ciudad", "localidad"]),
        Field::new(
            "state",
            "Provincia o estado",
            &[
                "state",
                "province",
                "state province",
                "provincia",
                "estado",
                "region",
                "provincia o estado",
            ],
        )
        .choices(&[
            "Buenos Aires",
            "Ciudad Autónoma de Buenos Aires",
            "Catamarca",
            "Chaco",
            "Chubut",
            "Córdoba",
            "Corrientes",
            "Entre Ríos",
            "Formosa",
            "Jujuy",
            "La Pampa",
            "La Rioja",
            "Mendoza",
            "Misiones",
            "Neuquén",
            "Río Negro",
            "Salta",
            "San Juan",
            "San Luis",
            "Santa Cruz",
            "Santa Fe",
            "Santiago del Estero",
            "Tierra del Fuego",
            "Tucumán",
        ]),
        Field::new(
            "country",
            "País",
            &[
                "country",
                "country of residence",
                "pais",
                "pais de residencia",
            ],
        )
        .choices(&[
            "Argentina",
            "Bolivia",
            "Brasil",
            "Chile",
            "Colombia",
            "Costa Rica",
            "Cuba",
            "Ecuador",
            "El Salvador",
            "España",
            "Estados Unidos",
            "Guatemala",
            "Honduras",
            "México",
            "Nicaragua",
            "Panamá",
            "Paraguay",
            "Perú",
            "República Dominicana",
            "Uruguay",
            "Venezuela",
        ]),
        Field::new(
            "location",
            "Ubicación",
            &[
                "location",
                "set your location",
                "your location",
                "current location",
                "ubicacion",
                "ubicacion actual",
                "indica tu ubicacion",
                "residencia",
                "lugar de residencia",
            ],
        ),
    ],
    &[
        Field::new(
            "linkedin",
            "LinkedIn",
            &[
                "linkedin",
                "linked in",
                "linkedin profile",
                "linkedin url",
                "perfil de linkedin",
                "enlace de linkedin",
            ],
        ),
        Field::new(
            "github",
            "GitHub",
            &[
                "github",
                "git hub",
                "github profile",
                "github url",
                "perfil de github",
                "enlace de github",
            ],
        ),
        Field::new(
            "website",
            "Sitio web o portafolio",
            &[
                "portfolio",
                "website",
                "personal website",
                "website url",
                "portfolio url",
                "sitio web",
                "pagina web",
                "portafolio",
                "portfolio personal",
            ],
        ),
        Field::new(
            "university",
            "Universidad",
            &[
                "university",
                "college",
                "institution",
                "school name",
                "universidad",
                "institucion educativa",
                "institucion",
                "centro de estudios",
            ],
        ),
        Field::new(
            "degree",
            "Carrera o título",
            &[
                "degree",
                "major",
                "field of study",
                "course of study",
                "carrera",
                "titulo",
                "area de estudio",
                "especialidad academica",
            ],
        ),
        Field::new(
            "academic",
            "Situación académica",
            &[
                "academic status",
                "student status",
                "education status",
                "estado academico",
                "situacion academica",
                "condicion academica",
            ],
        )
        .choices(&["En curso", "Graduado/a", "Estudios incompletos", "En pausa"]),
        Field::new(
            "year",
            "Año de cursada",
            &[
                "current year",
                "year of study",
                "academic year",
                "ano actual",
                "ano de carrera",
                "ano de cursada",
            ],
        )
        .choices(&["1", "2", "3", "4", "5", "6", "7"]),
        Field::new(
            "english",
            "Nivel de inglés",
            &[
                "english level",
                "english proficiency",
                "level of english",
                "nivel de ingles",
                "dominio del ingles",
                "english fluency",
            ],
        )
        .choices(&["A1", "A2", "B1", "B2", "C1", "C2", "Nativo"]),
        Field::new(
            "skills",
            "Habilidades técnicas",
            &[
                "skills",
                "technical skills",
                "technologies",
                "technology stack",
                "habilidades",
                "competencias tecnicas",
                "tecnologias",
                "conocimientos tecnicos",
                "habilidades tecnicas",
            ],
        )
        .multiline(),
    ],
    &[
        Field::new(
            "timezone",
            "Zona horaria",
            &["time zone", "timezone", "zona horaria", "huso horario"],
        )
        .choices(&[
            "America/Argentina/Buenos_Aires",
            "America/Montevideo",
            "America/Santiago",
            "America/Asuncion",
            "America/Sao_Paulo",
            "America/Bogota",
            "America/Lima",
            "America/Mexico_City",
            "America/New_York",
            "America/Los_Angeles",
            "Europe/Madrid",
            "UTC-12:00",
            "UTC-11:00",
            "UTC-10:00",
            "UTC-09:30",
            "UTC-09:00",
            "UTC-08:00",
            "UTC-07:00",
            "UTC-06:00",
            "UTC-05:00",
            "UTC-04:00",
            "UTC-03:30",
            "UTC-03:00",
            "UTC-02:00",
            "UTC-01:00",
            "UTC",
            "UTC+01:00",
            "UTC+02:00",
            "UTC+03:00",
            "UTC+03:30",
            "UTC+04:00",
            "UTC+04:30",
            "UTC+05:00",
            "UTC+05:30",
            "UTC+05:45",
            "UTC+06:00",
            "UTC+06:30",
            "UTC+07:00",
            "UTC+08:00",
            "UTC+08:45",
            "UTC+09:00",
            "UTC+09:30",
            "UTC+10:00",
            "UTC+10:30",
            "UTC+11:00",
            "UTC+12:00",
            "UTC+12:45",
            "UTC+13:00",
            "UTC+13:45",
            "UTC+14:00",
        ]),
        Field::new(
            "availability",
            "Horas disponibles por semana",
            &[
                "weekly availability",
                "hours per week",
                "weekly hours",
                "disponibilidad semanal",
                "horas semanales",
                "horas por semana",
            ],
        )
        .choices(&["10", "15", "20", "25", "30", "35", "40", "45", "48"]),
        Field::new(
            "start",
            "Disponibilidad para empezar",
            &[
                "earliest start",
                "available to start",
                "when can you start",
                "cuando puedes empezar",
                "cuando podes empezar",
                "disponibilidad para comenzar",
                "disponibilidad de inicio",
                "disponibilidad para empezar",
            ],
        )
        .choices(&[
            "Inmediata",
            "En una semana",
            "En dos semanas",
            "En un mes",
            "A convenir",
        ]),
        Field::new(
            "employment",
            "Tipo de empleo",
            &[
                "employment type",
                "job type",
                "contract type",
                "type of employment",
                "tipo de empleo",
                "tipo de contrato",
                "tipo de contratacion",
                "jornada laboral",
            ],
        )
        .choices(&[
            "Tiempo completo",
            "Tiempo parcial",
            "Pasantía",
            "Por proyecto",
            "Independiente",
            "Temporal",
        ]),
        Field::new(
            "modality",
            "Modalidad de trabajo",
            &[
                "work modality",
                "work mode",
                "work arrangement",
                "work preference",
                "remote preference",
                "modalidad",
                "modalidad de trabajo",
                "preferencia de trabajo",
            ],
        )
        .choices(&["Remoto", "Híbrido", "Presencial", "Sin preferencia"]),
        Field::new(
            "experience",
            "Años de experiencia",
            &[
                "years of experience",
                "anos de experiencia",
                "anos de experiencia laboral",
                "anos de experiencia profesional",
            ],
        )
        .choices(&[
            "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "15", "20",
        ]),
        Field::new(
            "message",
            "Presentación personal",
            &[
                "about you",
                "tell us about yourself",
                "cover message",
                "cover letter",
                "personal summary",
                "sobre ti",
                "sobre vos",
                "carta de presentacion",
                "presentacion personal",
                "cuentanos sobre ti",
                "contanos sobre vos",
            ],
        )
        .multiline(),
    ],
    &[
        Field::new(SALARY, "Salario pretendido en USD", &[]),
        Field::new(SALARY_PERIOD, "Período del salario", &[]).choices(PAY_PERIODS),
        Field::new(US_AUTHORIZATION, "¿Tenés permiso laboral en EE. UU.?", &[]).choices(YES_NO),
        Field::new(
            US_SPONSORSHIP,
            "¿Necesitás patrocinio de visa en EE. UU.?",
            &[],
        )
        .choices(YES_NO),
        Field::new(RESUME_PATH, "Archivo de CV", &[]),
        Field::new(
            COMPANY_MOTIVATION,
            "Borrador para la pregunta de la empresa",
            &[],
        )
        .multiline(),
    ],
];

pub fn editor_value<'a>(key: &str, stored: Option<&'a String>) -> &'a str {
    stored.map_or_else(
        || match key {
            SALARY_PERIOD | US_AUTHORIZATION | US_SPONSORSHIP => UNSPECIFIED,
            _ => "",
        },
        String::as_str,
    )
}

pub fn value_from_editor(field: &Field, entered: &str) -> Result<Option<String>, &'static str> {
    let entered = entered.trim();
    if entered.is_empty() {
        return Ok(None);
    }
    match field.key {
        SALARY => salary_amount(entered)
            .map(Some)
            .ok_or("Ingresá el salario en USD sin separadores de miles y con hasta dos decimales."),
        SALARY_PERIOD | US_AUTHORIZATION | US_SPONSORSHIP => {
            let normalized = normalize_label(entered);
            let selected = field
                .choices
                .iter()
                .find(|choice| normalize_label(choice) == normalized)
                .ok_or("Elegí una de las opciones del menú.")?;
            Ok((*selected != UNSPECIFIED).then(|| (*selected).to_owned()))
        }
        RESUME_PATH if !is_resume_path(entered) => {
            Err("Elegí un archivo de CV en formato PDF, DOC, DOCX o TXT.")
        }
        _ => Ok(Some(entered.replace("\r\n", "\n"))),
    }
}

fn salary_amount(entered: &str) -> Option<String> {
    let (whole, fraction) = entered.split_once(['.', ',']).unwrap_or((entered, ""));
    if whole.is_empty()
        || !whole.bytes().all(|digit| digit.is_ascii_digit())
        || fraction.len() > 2
        || !fraction.bytes().all(|digit| digit.is_ascii_digit())
        || (fraction.is_empty() && whole != entered)
    {
        return None;
    }
    let whole: u64 = whole.parse().ok()?;
    Some(if fraction.is_empty() {
        whole.to_string()
    } else {
        format!("{whole}.{fraction}")
    })
}

pub fn is_resume_path(value: &str) -> bool {
    let path = Path::new(value);
    path.is_absolute()
        && path.extension().is_some_and(|extension| {
            ["pdf", "doc", "docx", "txt"]
                .iter()
                .any(|format| extension.eq_ignore_ascii_case(format))
        })
}

pub(crate) fn normalize_label(label: &str) -> String {
    let mut label = label
        .to_lowercase()
        .chars()
        .map(|ch| match ch {
            'á' | 'à' | 'ä' => 'a',
            'é' | 'è' | 'ë' => 'e',
            'í' | 'ì' | 'ï' => 'i',
            'ó' | 'ò' | 'ö' => 'o',
            'ú' | 'ù' | 'ü' => 'u',
            'ñ' => 'n',
            '\u{0300}'..='\u{036f}' => '\0',
            ch if ch.is_ascii_alphanumeric() => ch,
            _ => ' ',
        })
        .filter(|ch| *ch != '\0')
        .collect::<String>()
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ");

    for suffix in [
        " required",
        " optional",
        " obligatorio",
        " obligatoria",
        " opcional",
    ] {
        if let Some(base) = label.strip_suffix(suffix) {
            label.truncate(base.len());
            break;
        }
    }
    label
}

pub fn identify(name: &str, label: &str) -> Option<&'static str> {
    let name = normalize_label(name);
    let label = normalize_label(label);
    let matches = |text: &str| {
        SECTIONS
            .iter()
            .flat_map(|section| section.iter())
            .find(|field| field.aliases.contains(&text))
            .map(|field| field.key)
    };
    match (matches(&name), matches(&label)) {
        (Some(key), Some(other)) if key == other => Some(key),
        (Some(key), _) if label.is_empty() => Some(key),
        (_, Some(key)) if name.is_empty() => Some(key),
        _ => None,
    }
}

pub fn value_for<'a>(profile: &'a Profile, key: &str) -> Option<std::borrow::Cow<'a, str>> {
    if let Some(value) = profile.get(key) {
        return Some(std::borrow::Cow::Borrowed(value));
    }
    if key == "full_name" && profile.contains_key("first_name") && profile.contains_key("last_name")
    {
        let parts = ["first_name", "middle_name", "last_name"]
            .into_iter()
            .filter_map(|name| profile.get(name).map(String::as_str))
            .collect::<Vec<_>>();
        return Some(std::borrow::Cow::Owned(parts.join(" ")));
    }
    None
}

pub fn path() -> io::Result<PathBuf> {
    let local = std::env::var_os("LOCALAPPDATA")
        .filter(|path| !path.is_empty())
        .ok_or_else(|| io::Error::other("Windows no indicó la carpeta de datos del usuario."))?;
    Ok(PathBuf::from(local)
        .join("OrbitaAutofill")
        .join("profile.bin"))
}

pub fn load(path: &Path) -> io::Result<Option<Profile>> {
    let bytes = match fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(error),
    };
    let decrypted = protect(&bytes, false).map_err(io::Error::other)?;
    Ok(Some(serde_json::from_slice(&decrypted)?))
}

pub fn save(path: &Path, profile: &Profile) -> io::Result<()> {
    let data = serde_json::to_vec(profile)?;
    let encrypted = protect(&data, true).map_err(io::Error::other)?;
    write_atomically(path, &encrypted)
}

pub(crate) fn write_atomically(path: &Path, bytes: &[u8]) -> io::Result<()> {
    fs::create_dir_all(path.parent().expect("El perfil tiene un directorio"))?;
    let temporary = path.with_extension("tmp");
    let result = (|| {
        let mut file = fs::File::create(&temporary)?;
        file.write_all(bytes)?;
        file.sync_all()?;
        drop(file);
        fs::rename(&temporary, path)
    })();
    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

fn protect(data: &[u8], encrypt: bool) -> WindowsResult<Vec<u8>> {
    let input = CRYPT_INTEGER_BLOB {
        cbData: data.len() as u32,
        pbData: data.as_ptr().cast_mut(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    // DPAPI returns a buffer owned by LocalFree on success.
    unsafe {
        if encrypt {
            CryptProtectData(
                &input,
                PCWSTR::null(),
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )?;
        } else {
            CryptUnprotectData(
                &input,
                None,
                None,
                None,
                None,
                CRYPTPROTECT_UI_FORBIDDEN,
                &mut output,
            )?;
        }
        let bytes = std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec();
        let _ = LocalFree(Some(HLOCAL(output.pbData.cast())));
        Ok(bytes)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn matches_bilingual_labels_without_guessing_from_partial_names() {
        assert_eq!(identify("Correo electrónico *", ""), Some("email"));
        assert_eq!(
            identify("Last name (required)", "Last name"),
            Some("last_name")
        );
        assert_eq!(identify("GitHub URL", ""), Some("github"));
        assert_eq!(identify("Name", "Account holder name"), None);
        assert_eq!(identify("User Name", ""), None);
        assert_eq!(identify("Current employer name", ""), None);
        assert_eq!(identify("Verification phone number", ""), None);
    }

    #[test]
    fn application_fields_keep_unknown_answers_distinct_from_no() {
        let field = |key| {
            SECTIONS
                .iter()
                .flat_map(|section| section.iter())
                .find(|field| field.key == key)
                .unwrap()
        };
        let validate = |key, value| value_from_editor(field(key), value);
        assert_eq!(editor_value(US_AUTHORIZATION, None), UNSPECIFIED);
        assert_eq!(validate(US_AUTHORIZATION, "Sin indicar"), Ok(None));
        assert_eq!(validate(US_AUTHORIZATION, "No"), Ok(Some("No".into())));
        assert_eq!(validate(US_SPONSORSHIP, "si"), Ok(Some("Sí".into())));
        assert!(validate(US_SPONSORSHIP, "Depende").is_err());
        assert_eq!(validate(SALARY, "1250,50"), Ok(Some("1250.50".into())));
        assert_eq!(validate(SALARY, "0"), Ok(Some("0".into())));
        assert!(validate(SALARY, "1.250").is_err());
        assert!(validate(SALARY, "USD 500").is_err());
        assert!(validate(RESUME_PATH, r"C:\CV\Currículum.PDF").is_ok());
        assert!(validate(RESUME_PATH, r"https://example.invalid/cv.pdf").is_err());
        assert_eq!(identify("Desired Salary", ""), None);
    }

    #[test]
    fn writes_an_encrypted_profile_and_can_replace_it() -> io::Result<()> {
        let path = std::env::temp_dir()
            .join(format!("orbita-autofill-test-{}", std::process::id()))
            .join("profile.bin");
        let mut profile = Profile::from([("email".into(), "test@example.invalid".into())]);
        assert_eq!(load(&path)?, None);
        save(&path, &profile)?;
        assert!(!String::from_utf8_lossy(&fs::read(&path)?).contains("test@example.invalid"));
        assert_eq!(load(&path)?, Some(profile.clone()));
        profile.extend([
            (SALARY.into(), "1250.50".into()),
            (SALARY_PERIOD.into(), "Mensual".into()),
            (US_AUTHORIZATION.into(), "No".into()),
            (US_SPONSORSHIP.into(), "Sí".into()),
            (RESUME_PATH.into(), r"C:\CV\Currículum.PDF".into()),
            (
                COMPANY_MOTIVATION.into(),
                "Primer párrafo.\nSegundo párrafo.".into(),
            ),
        ]);
        save(&path, &profile)?;
        assert_eq!(load(&path)?, Some(profile));
        fs::remove_file(&path)?;
        fs::remove_dir(path.parent().unwrap())
    }
}
