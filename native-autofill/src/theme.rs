use windows::Win32::Foundation::*;
use windows::Win32::Graphics::Dwm::{DWMWA_CAPTION_COLOR, DwmSetWindowAttribute};
use windows::Win32::Graphics::Gdi::*;
use windows::Win32::UI::Controls::{
    COMBOBOXINFO, DRAWITEMSTRUCT, GetComboBoxInfo, ODS_FOCUS, ODS_SELECTED,
};
use windows::Win32::UI::Shell::{DefSubclassProc, RemoveWindowSubclass, SetWindowSubclass};
use windows::Win32::UI::WindowsAndMessaging::*;
use windows::core::{PCWSTR, w};

pub const WIDTH: i32 = 846;
pub const HEIGHT: i32 = 578;
pub const RAIL: i32 = 224;
pub const LEFT: i32 = RAIL + 28;
pub const RIGHT: i32 = WIDTH - 28;
const ART: &[u8] = include_bytes!("../assets/saturn.bmp");
const LOGO: &[u8] = include_bytes!("../assets/orbita.png");

const fn color(hex: u32) -> COLORREF {
    COLORREF(((hex & 255) << 16) | (hex & 0xff00) | (hex >> 16))
}
const SKY: COLORREF = color(0x0e1723);
pub const PANEL: COLORREF = color(0x16202d);
pub const FIELD: COLORREF = color(0x202d3c);
pub const INK: COLORREF = color(0xf2f2ed);
pub const MUTED: COLORREF = color(0xb0bdcc);
const EDGE: COLORREF = color(0x415064);
const COPPER: COLORREF = color(0xeac199);
const SELECTED: COLORREF = color(0x293749);

pub fn scaled(value: i32, dpi: i32) -> i32 {
    (value * dpi + 48) / 96
}

pub fn logo(size: i32) -> windows::core::Result<HICON> {
    unsafe { CreateIconFromResourceEx(LOGO, true, 0x30000, size, size, LR_DEFAULTCOLOR) }
}

pub fn caption(hwnd: HWND) {
    unsafe {
        let _ = DwmSetWindowAttribute(
            hwnd,
            DWMWA_CAPTION_COLOR,
            (&SKY as *const COLORREF).cast(),
            4,
        );
    }
}

pub struct Theme {
    dpi: i32,
    pub body: HFONT,
    pub title: HFONT,
    small: HFONT,
    brand: HFONT,
    symbols: HFONT,
}

impl Theme {
    pub fn new(dpi: i32) -> Self {
        let font = |size, weight, face: PCWSTR| unsafe {
            CreateFontW(
                -scaled(size, dpi),
                0,
                0,
                0,
                weight,
                0,
                0,
                0,
                DEFAULT_CHARSET,
                OUT_DEFAULT_PRECIS,
                CLIP_DEFAULT_PRECIS,
                CLEARTYPE_QUALITY,
                0,
                face,
            )
        };
        Self {
            dpi,
            body: font(14, 400, w!("Segoe UI")),
            title: font(29, 600, w!("Segoe UI")),
            small: font(12, 400, w!("Consolas")),
            brand: font(24, 600, w!("Segoe UI")),
            symbols: font(16, 400, w!("Segoe MDL2 Assets")),
        }
    }

    pub fn rect(&self, x: i32, y: i32, w: i32, h: i32) -> RECT {
        let s = |n| scaled(n, self.dpi);
        RECT {
            left: s(x),
            top: s(y),
            right: s(x + w),
            bottom: s(y + h),
        }
    }

    pub fn background(&self, dc: HDC, icon: HICON, settings: bool) {
        fill(dc, self.rect(0, 0, WIDTH, HEIGHT), PANEL);
        fill(dc, self.rect(0, 0, RAIL, HEIGHT), SKY);
        let art = self.rect(0, HEIGHT - 316, RAIL, 316);
        let info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: 448,
                biHeight: 632,
                biPlanes: 1,
                biBitCount: 24,
                ..Default::default()
            },
            ..Default::default()
        };
        unsafe {
            SetStretchBltMode(dc, HALFTONE);
            let _ = SetBrushOrgEx(dc, 0, 0, None);
            StretchDIBits(
                dc,
                art.left,
                art.top,
                art.right - art.left,
                art.bottom - art.top,
                0,
                0,
                448,
                632,
                Some(ART[54..].as_ptr().cast()),
                &info,
                DIB_RGB_COLORS,
                SRCCOPY,
            );
            let mark = self.rect(19, 28, 40, 40);
            let _ = DrawIconEx(
                dc,
                mark.left,
                mark.top,
                icon,
                mark.right - mark.left,
                mark.bottom - mark.top,
                0,
                None,
                DI_NORMAL,
            );
        }
        self.text(
            dc,
            self.rect(69, 21, 147, 34),
            "ÓRBITA",
            self.brand,
            INK,
            DT_LEFT,
        );
        self.text(
            dc,
            self.rect(71, 54, 139, 19),
            "Autofill",
            self.body,
            MUTED,
            DT_LEFT,
        );
        self.text(
            dc,
            self.rect(20, 96, 182, 18),
            "SECCIONES",
            self.small,
            MUTED,
            DT_LEFT,
        );
        self.text(
            dc,
            self.rect(LEFT, 17, 480, 20),
            if settings {
                "ÓRBITA AUTOFILL"
            } else {
                "PERFIL DE AUTOCOMPLETADO"
            },
            self.small,
            COPPER,
            DT_LEFT,
        );
        fill(dc, self.rect(RAIL, 0, 1, HEIGHT), color(0x2c3846));
        fill(dc, self.rect(0, 516, RAIL, HEIGHT - 516), SKY);
        fill(dc, self.rect(LEFT, 512, RIGHT - LEFT, 1), EDGE);
    }

    pub fn button(
        &self,
        item: &DRAWITEMSTRUCT,
        nav_icon: Option<&str>,
        active: bool,
        primary: bool,
    ) {
        let dc = item.hDC;
        let mut rect = item.rcItem;
        let pressed = item.itemState.0 & ODS_SELECTED.0 != 0;
        let focused = item.itemState.0 & ODS_FOCUS.0 != 0;
        let background = if pressed {
            color(0x4e5660)
        } else if primary {
            COPPER
        } else if active {
            SELECTED
        } else if nav_icon.is_some() {
            color(0x182433)
        } else {
            FIELD
        };
        fill(dc, rect, if nav_icon.is_some() { SKY } else { PANEL });
        let outline = if focused {
            if primary { INK } else { COPPER }
        } else {
            background
        };
        let diameter = scaled(2 * 28, self.dpi)
            .min(rect.bottom - rect.top)
            .min(rect.right - rect.left);
        unsafe {
            let old_brush = SelectObject(dc, brush(dc, background).into());
            let old_pen = SelectObject(dc, GetStockObject(DC_PEN));
            SetDCPenColor(dc, outline);
            let _ = RoundRect(
                dc,
                rect.left,
                rect.top,
                rect.right,
                rect.bottom,
                diameter,
                diameter,
            );
            SelectObject(dc, old_pen);
            SelectObject(dc, old_brush);
        }
        let ink = if primary && !pressed {
            SKY
        } else if active {
            COPPER
        } else {
            INK
        };
        let mut title = [0u16; 128];
        let len = unsafe { GetWindowTextW(item.hwndItem, &mut title) } as usize;
        let align = if let Some(symbol) = nav_icon {
            rect.left += scaled(16, self.dpi);
            self.text(dc, rect, symbol, self.symbols, ink, DT_LEFT);
            rect.left += scaled(27, self.dpi);
            DT_LEFT
        } else {
            DT_CENTER
        };
        self.text(
            dc,
            rect,
            &String::from_utf16_lossy(&title[..len]),
            self.body,
            ink,
            align,
        );
    }

    fn text(
        &self,
        dc: HDC,
        mut rect: RECT,
        text: &str,
        font: HFONT,
        ink: COLORREF,
        align: DRAW_TEXT_FORMAT,
    ) {
        let mut chars: Vec<u16> = text.encode_utf16().collect();
        unsafe {
            let old = SelectObject(dc, font.into());
            SetTextColor(dc, ink);
            SetBkMode(dc, TRANSPARENT);
            DrawTextW(
                dc,
                &mut chars,
                &mut rect,
                align | DT_SINGLELINE | DT_VCENTER | DT_NOPREFIX,
            );
            SelectObject(dc, old);
        }
    }

    pub fn field(&self, dc: HDC, rect: RECT, focused: bool) {
        fill(dc, rect, FIELD);
        frame(dc, rect, if focused { COPPER } else { EDGE });
    }
}

pub fn brush(dc: HDC, color: COLORREF) -> HBRUSH {
    unsafe {
        SetDCBrushColor(dc, color);
        HBRUSH(GetStockObject(DC_BRUSH).0)
    }
}

pub fn style_combo(hwnd: HWND, dpi: i32) {
    unsafe {
        let _ = SetWindowSubclass(hwnd, Some(combo_proc), 1, dpi as usize);
    }
}

extern "system" fn combo_proc(
    hwnd: HWND,
    msg: u32,
    wp: WPARAM,
    lp: LPARAM,
    id: usize,
    dpi: usize,
) -> LRESULT {
    unsafe {
        if msg == WM_NCDESTROY {
            let _ = RemoveWindowSubclass(hwnd, Some(combo_proc), id);
        }
        let result = DefSubclassProc(hwnd, msg, wp, lp);
        if !matches!(msg, WM_PAINT | WM_PRINTCLIENT | WM_PRINT) {
            return result;
        }
        let mut info = COMBOBOXINFO {
            cbSize: size_of::<COMBOBOXINFO>() as u32,
            ..Default::default()
        };
        let mut rect = RECT::default();
        if GetComboBoxInfo(hwnd, &mut info).is_err() || GetClientRect(hwnd, &mut rect).is_err() {
            return result;
        }
        let own_dc = wp.0 == 0;
        let dc = if own_dc {
            GetDC(Some(hwnd))
        } else {
            HDC(wp.0 as *mut _)
        };
        let saved = SaveDC(dc);
        if saved != 0 {
            // Preserve the native editor and its selection when drawing the border and arrow.
            let edit = info.rcItem;
            ExcludeClipRect(dc, edit.left, edit.top, edit.right, edit.bottom);
            fill(dc, rect, FIELD);
            let button = info.rcButton;
            let cx = (button.left + button.right) / 2;
            let cy = (button.top + button.bottom) / 2;
            let arm = scaled(4, dpi as i32);
            SelectObject(dc, GetStockObject(DC_PEN));
            SetDCPenColor(dc, MUTED);
            let _ = Polyline(
                dc,
                &[
                    POINT {
                        x: cx - arm,
                        y: cy - arm / 2,
                    },
                    POINT {
                        x: cx,
                        y: cy + arm / 2,
                    },
                    POINT {
                        x: cx + arm,
                        y: cy - arm / 2,
                    },
                ],
            );
            let _ = RestoreDC(dc, saved);
        }
        if own_dc {
            ReleaseDC(Some(hwnd), dc);
        }
        result
    }
}

fn fill(dc: HDC, rect: RECT, color: COLORREF) {
    unsafe {
        FillRect(dc, &rect, brush(dc, color));
    }
}

fn frame(dc: HDC, rect: RECT, color: COLORREF) {
    unsafe {
        FrameRect(dc, &rect, brush(dc, color));
    }
}

impl Drop for Theme {
    fn drop(&mut self) {
        for font in [self.body, self.small, self.title, self.brand, self.symbols] {
            unsafe {
                let _ = DeleteObject(font.into());
            }
        }
    }
}
