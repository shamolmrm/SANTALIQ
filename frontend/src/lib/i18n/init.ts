/** Runs before paint: sets <html lang> from the saved interface language (see lib/i18n). */
export const localeInitScript = `try{var l=localStorage.getItem("santaliq.locale");if(l==="en"||l==="bn")document.documentElement.lang=l;else if((navigator.language||"").toLowerCase().indexOf("bn")===0)document.documentElement.lang="bn"}catch(e){}`;
