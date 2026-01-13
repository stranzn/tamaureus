// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod db;
mod models;
mod user_config;
mod player;
mod utils;

fn main() {
    tamaureus_lib::run()
}
