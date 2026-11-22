fn main() {
    println!("cargo:rerun-if-changed=orbita.rc");
    println!("cargo:rerun-if-changed=../Orbita_Logo.ico");
    embed_resource::compile("orbita.rc", embed_resource::NONE)
        .manifest_required()
        .expect("No se pudo incrustar el ícono de Órbita");
}
