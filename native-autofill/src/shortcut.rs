use std::fs;
use std::io;
use std::path::Path;

use windows::Win32::Foundation::HWND;
use windows::Win32::UI::Input::KeyboardAndMouse::*;

use crate::profile::write_atomically;

const MODIFIERS: [(HOT_KEY_MODIFIERS, &str); 4] = [
    (MOD_CONTROL, "Ctrl"),
    (MOD_ALT, "Alt"),
    (MOD_SHIFT, "Shift"),
    (MOD_WIN, "Win"),
];

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Shortcut {
    modifiers: HOT_KEY_MODIFIERS,
    key: VIRTUAL_KEY,
}

impl Default for Shortcut {
    fn default() -> Self {
        Self {
            modifiers: MOD_CONTROL | MOD_SHIFT,
            key: VK_F,
        }
    }
}

impl Shortcut {
    pub fn read(path: &Path) -> io::Result<Self> {
        let bytes = match fs::read(path) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(Self::default()),
            Err(error) => return Err(error),
        };
        let (modifiers, key): (u32, u16) = serde_json::from_slice(&bytes)?;
        let shortcut = Self {
            modifiers: HOT_KEY_MODIFIERS(modifiers),
            key: VIRTUAL_KEY(key),
        };
        shortcut
            .validate()
            .map_err(|message| io::Error::new(io::ErrorKind::InvalidData, message))?;
        Ok(shortcut)
    }

    pub fn save(self, path: &Path) -> io::Result<()> {
        let bytes = serde_json::to_vec(&(self.modifiers.0, self.key.0))?;
        write_atomically(path, &bytes)
    }

    pub fn from_keyboard(key: VIRTUAL_KEY) -> Self {
        let pressed = |key: VIRTUAL_KEY| unsafe { GetKeyState(i32::from(key.0)) < 0 };
        let mut modifiers = HOT_KEY_MODIFIERS(0);
        for (key, flag) in [
            (VK_CONTROL, MOD_CONTROL),
            (VK_MENU, MOD_ALT),
            (VK_SHIFT, MOD_SHIFT),
            (VK_LWIN, MOD_WIN),
            (VK_RWIN, MOD_WIN),
        ] {
            if pressed(key) {
                modifiers |= flag;
            }
        }
        Self { modifiers, key }
    }

    pub fn is_modifier(key: VIRTUAL_KEY) -> bool {
        matches!(
            key,
            VK_CONTROL
                | VK_MENU
                | VK_SHIFT
                | VK_LCONTROL
                | VK_RCONTROL
                | VK_LMENU
                | VK_RMENU
                | VK_LSHIFT
                | VK_RSHIFT
                | VK_LWIN
                | VK_RWIN
        )
    }

    pub fn cancels_capture(self) -> bool {
        let mods = self.modifiers.0;
        (self.key == VK_ESCAPE && mods == 0) || (self.key == VK_TAB && (mods & !MOD_SHIFT.0) == 0)
    }

    pub fn validate(self) -> std::result::Result<(), &'static str> {
        if self.key == VK_F12 {
            return Err("Windows reserva F12. Probá con otra tecla.");
        }
        let valid_modifiers = MOD_CONTROL | MOD_ALT | MOD_SHIFT | MOD_WIN;
        if !(8..=254).contains(&self.key.0)
            || Self::is_modifier(self.key)
            || self.modifiers.0 & !valid_modifiers.0 != 0
        {
            return Err("Esa tecla no está disponible como atajo.");
        }
        if self.modifiers.0 == 0 && !(VK_F1.0..=VK_F24.0).contains(&self.key.0) {
            return Err("Usá un modificador junto con otra tecla, o una tecla de función.");
        }
        Ok(())
    }

    pub fn register(self, window: HWND, id: i32) -> windows::core::Result<()> {
        unsafe {
            RegisterHotKey(
                Some(window),
                id,
                self.modifiers | MOD_NOREPEAT,
                u32::from(self.key.0),
            )
        }
    }

    pub fn matches_event(self, event: isize) -> bool {
        let event = event as u32;
        (event & 0xffff & !MOD_NOREPEAT.0) == self.modifiers.0
            && (event >> 16) == u32::from(self.key.0)
    }

    pub fn label(self) -> String {
        let mut pieces = MODIFIERS
            .iter()
            .filter(|(flag, _)| self.modifiers.0 & flag.0 != 0)
            .map(|(_, name)| *name)
            .collect::<Vec<_>>();
        let key = key_name(self.key);
        pieces.push(&key);
        pieces.join(" + ")
    }
}

fn key_name(key: VIRTUAL_KEY) -> String {
    if (VK_A.0..=VK_Z.0).contains(&key.0) || (VK_0.0..=VK_9.0).contains(&key.0) {
        return char::from(key.0 as u8).to_string();
    }
    if (VK_F1.0..=VK_F24.0).contains(&key.0) {
        return format!("F{}", key.0 - VK_F1.0 + 1);
    }
    let mut name = [0u16; 64];
    let code = unsafe { MapVirtualKeyW(u32::from(key.0), MAPVK_VK_TO_VSC_EX) };
    let extended = u32::from(code & 0xff00 != 0);
    let flags = ((code & 0xff) << 16) | (extended << 24);
    let length = unsafe { GetKeyNameTextW(flags as i32, &mut name) };
    if length > 0 {
        return String::from_utf16_lossy(&name[..length as usize]);
    }
    format!("Tecla {}", key.0)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_combinations_and_function_keys() {
        assert_eq!(Shortcut::default().label(), "Ctrl + Shift + F");
        let alt_j = Shortcut {
            modifiers: MOD_ALT,
            key: VK_J,
        };
        assert!(alt_j.validate().is_ok());
        assert!(alt_j.matches_event(((VK_J.0 as isize) << 16) | MOD_ALT.0 as isize));
        assert!(!alt_j.matches_event(((VK_J.0 as isize) << 16) | MOD_CONTROL.0 as isize));
        let bare = |key| Shortcut {
            modifiers: HOT_KEY_MODIFIERS(0),
            key,
        };
        assert!(bare(VK_F9).validate().is_ok());
        assert!(bare(VK_F12).validate().is_err());
        assert!(bare(VK_J).validate().is_err());
        assert!(bare(VK_ESCAPE).cancels_capture());
    }

    #[test]
    fn reads_default_and_persists_changes() -> io::Result<()> {
        let directory =
            std::env::temp_dir().join(format!("orbita-shortcut-test-{}", std::process::id()));
        let path = directory.join("shortcut.json");
        assert_eq!(Shortcut::read(&path)?, Shortcut::default());
        let new_shortcut = Shortcut {
            modifiers: MOD_CONTROL | MOD_ALT,
            key: VK_U,
        };
        new_shortcut.save(&path)?;
        assert_eq!(Shortcut::read(&path)?, new_shortcut);
        Shortcut::default().save(&path)?;
        assert_eq!(Shortcut::read(&path)?, Shortcut::default());
        fs::remove_file(&path)?;
        fs::remove_dir(&directory)
    }
}
