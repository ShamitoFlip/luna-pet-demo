// Número que ya utilizaba el proyecto. Formato internacional, sin + ni espacios.
window.LUNA_CONFIG = Object.freeze({ whatsappNumero: '56971582988' });
window.LunaContact = Object.freeze({
  whatsappUrl(message) {
    return `https://wa.me/${window.LUNA_CONFIG.whatsappNumero}?text=${encodeURIComponent(message)}`;
  }
});
