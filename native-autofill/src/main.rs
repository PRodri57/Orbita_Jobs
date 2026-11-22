#![cfg_attr(not(test), windows_subsystem = "windows")]

mod browser;
mod form;
mod profile;
mod shortcut;
mod theme;
mod window;

fn main() {
    if let Err(error) = window::run() {
        window::show_error(&error.to_string());
    }
}
