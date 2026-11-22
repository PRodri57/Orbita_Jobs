// ==UserScript==
// @name         Job Form Autofill
// @namespace    pablo.prodri57.job-autofill
// @version      2.0.2
// @description  Autofill laboral y de registro EN/ES. Ctrl+Shift+F, menú de Violentmonkey, contraseñas aleatorias y deshacer.
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict';

  const ACCOUNT = Object.freeze({ email: 'pabloirodriguez2005@gmail.com', passwordLength: 20 });
  // Las credenciales generadas viven sólo en memoria, hasta recargar/cerrar la página.
  const accountSessions = new WeakMap();
  let recentCredentials = null;
  let history = [];
  let lastReport = [];

  // 1. Configuración / datos. Se usan sólo al presionar la combinación de teclas.
  // El sitio puede leer los valores de su formulario; no hay llamadas de red aquí.
  const DATA = Object.freeze({
    fullName: 'Pablo Ivan Rodriguez', firstName: 'Pablo', middleName: 'Ivan', lastName: 'Rodriguez',
    email: 'pabloirodriguez2005@gmail.com', phone: '+54 1124033923',
    city: 'Campana', state: 'Buenos Aires', location: 'Campana, Buenos Aires', country: 'Argentina',
    timezone: 'UTC-3', linkedin: 'https://www.linkedin.com/in/pablo-iván-rodríguez',
    github: 'https://github.com/PRodri57', website: 'https://orbita.prodri57.workers.dev/',
    university: 'Universidad de Palermo', weeklyHours: '20', experience: '0',
    skills: ['Java', 'Python', 'JavaScript', 'React', 'SQL', 'PostgreSQL', 'Supabase', 'H2', 'Git',
      'GitHub', 'Linux', 'REST APIs', 'HTML', 'CSS', 'Full-Stack Development', 'Backend Development',
      'Database Design', 'Software Development'],
    en: {
      degree: 'Computer Engineering', academic: '4th-year Computer Engineering student',
      year: '4th year', graduation: 'July 2028', english: 'Advanced / B2 / Cambridge B2 First',
      availability: '20 hours/week', start: 'Immediately', modality: 'Remote', employment: 'Internship',
      experience: '0 years of formal professional experience',
      message: "I'm a fourth-year Computer Engineering student at Universidad de Palermo with hands-on experience building full-stack and backend software projects. I work with technologies including Java, Python, React, PostgreSQL, Supabase, SQL and Git, and I'm particularly interested in opportunities where I can continue developing my software engineering skills while contributing to real-world products. I'm available to start immediately and can commit approximately 20 hours per week."
    },
    es: {
      degree: 'Ingeniería en Informática', academic: 'Estudiante de 4to año de Ingeniería en Informática',
      year: '4to año', graduation: 'Julio 2028', english: 'Avanzado / B2 / Cambridge B2 First',
      availability: '20 horas semanales', start: 'Inmediatamente', modality: 'Remoto', employment: 'Pasantía',
      experience: '0 años de experiencia profesional formal',
      message: 'Soy estudiante de cuarto año de Ingeniería en Informática en la Universidad de Palermo, con experiencia práctica desarrollando proyectos de software full-stack y backend. Trabajo con tecnologías como Java, Python, React, PostgreSQL, Supabase, SQL y Git, y busco oportunidades donde pueda seguir desarrollando mis habilidades de ingeniería de software mientras contribuyo en productos reales. Tengo disponibilidad inmediata y puedo dedicar aproximadamente 20 horas semanales.'
    }
  });

  // 2. Diccionario EN/ES. Las coincidencias son de palabras completas, no subcadenas.
  const ALIASES = {
    fullName: ['full name', 'name', 'candidate name', 'applicant name', 'legal name', 'your name', 'nombre', 'nombre completo', 'nombre y apellido', 'nombre del candidato'],
    firstName: ['first name', 'given name', 'nombre de pila', 'primer nombre', 'nombres'],
    middleName: ['middle name', 'segundo nombre'], lastName: ['last name', 'surname', 'family name', 'apellido', 'apellidos'],
    email: ['email', 'e mail', 'email address', 'correo', 'correo electronico', 'direccion de correo'],
    phone: ['phone', 'phone number', 'telephone', 'mobile', 'mobile number', 'telefono', 'celular', 'numero de telefono'],
    city: ['city', 'town', 'ciudad', 'localidad'], state: ['state', 'province', 'provincia', 'estado', 'region'],
    location: ['location', 'current location', 'ubicacion', 'residencia', 'lugar de residencia', 'donde vives'],
    country: ['country', 'country of residence', 'pais', 'pais de residencia'],
    timezone: ['time zone', 'timezone', 'zona horaria', 'huso horario'],
    linkedin: ['linkedin', 'linkedin profile', 'perfil de linkedin'], github: ['github', 'github profile', 'perfil de github'],
    website: ['portfolio', 'website', 'personal website', 'portfolio url', 'sitio web', 'pagina web', 'portafolio', 'portfolio personal'],
    university: ['university', 'college', 'institution', 'school name', 'universidad', 'institucion educativa', 'institucion', 'centro de estudios'],
    degree: ['degree', 'major', 'field of study', 'course of study', 'carrera', 'titulo', 'area de estudio', 'especialidad academica'],
    academic: ['academic status', 'student status', 'education status', 'estado academico', 'situacion academica', 'condicion academica'],
    year: ['current year', 'year of study', 'academic year', 'ano actual', 'ano de carrera', 'ano de cursada', 'ano que cursas'],
    graduation: ['expected graduation', 'graduation date', 'graduation month', 'graduation year', 'fecha estimada de graduacion', 'fecha de graduacion', 'ano de graduacion', 'egreso previsto', 'fecha de egreso'],
    english: ['english level', 'english proficiency', 'level of english', 'nivel de ingles', 'dominio del ingles', 'english fluency'],
    availability: ['weekly availability', 'hours per week', 'weekly hours', 'disponibilidad semanal', 'horas semanales', 'horas por semana', 'availability', 'disponibilidad'],
    start: ['start date', 'earliest start', 'available to start', 'when can you start', 'fecha de inicio', 'fecha de incorporacion', 'cuando puedes empezar', 'cuando podes empezar', 'disponibilidad para comenzar', 'disponibilidad de inicio'],
    employment: ['employment type', 'job type', 'contract type', 'type of employment', 'tipo de empleo', 'tipo de contrato', 'tipo de contratacion', 'jornada laboral'],
    modality: ['work modality', 'work mode', 'work arrangement', 'work preference', 'remote preference', 'modalidad', 'modalidad de trabajo', 'preferencia de trabajo'],
    salary: ['salary', 'salary expectation', 'expected salary', 'compensation', 'expected compensation', 'salary expectations', 'hourly rate', 'pay expectation', 'pretension salarial', 'remuneracion', 'expectativa salarial', 'salario', 'sueldo', 'tarifa por hora'],
    experience: ['professional experience', 'years of experience', 'work experience', 'experiencia profesional', 'anos de experiencia', 'experiencia laboral'],
    authorization: ['authorized to work', 'authorised to work', 'work authorization', 'work authorisation', 'legally eligible to work', 'legal right to work', 'autorizado para trabajar', 'autorizada para trabajar', 'autorizacion laboral', 'permiso de trabajo'],
    sponsorship: ['sponsorship', 'sponsor', 'patrocinio', 'patrocinador', 'visa sponsorship', 'sponsoreo'],
    skills: ['skills', 'technical skills', 'technologies', 'technology stack', 'habilidades', 'competencias tecnicas', 'tecnologias', 'conocimientos tecnicos', 'development category', 'categoria de desarrollo'],
    message: ['message', 'additional information', 'about you', 'comments', 'cover message', 'cover letter', 'personal summary', 'mensaje', 'informacion adicional', 'sobre ti', 'sobre vos', 'comentarios', 'carta de presentacion', 'presentacion personal', 'cuentanos sobre ti']
  };
  const CHOICES = {
    country: [['Argentina', 'AR', 'ARG']],
    state: [['Buenos Aires', 'Provincia de Buenos Aires', 'Buenos Aires Province']],
    timezone: [['UTC-3', 'GMT-3', 'UTC-03:00', 'GMT-03:00', 'America/Argentina/Buenos_Aires', 'Buenos Aires']],
    university: [['Universidad de Palermo', 'University of Palermo', 'UP']],
    degree: [['Computer Engineering', 'Ingeniería en Informática']],
    academic: [['4th-year Computer Engineering student', 'Estudiante de 4to año de Ingeniería en Informática']],
    year: [['4th year', '4to año', 'fourth year', 'cuarto año', '4']],
    graduation: [['July 2028', 'Julio 2028', '2028-07']],
    english: [['Advanced', 'Avanzado'], ['B2', 'Cambridge B2 First', 'FCE'], ['Upper Intermediate', 'Upper-Intermediate', 'Intermedio alto'], ['Fluent', 'Fluido']],
    start: [['Immediately', 'Inmediatamente', 'Immediate', 'Disponibilidad inmediata', 'As soon as possible']],
    employment: [['Internship', 'Intern', 'Pasantía', 'Prácticas', 'Beca'], ['Part-time', 'Part time', 'Medio tiempo', 'Tiempo parcial'], ['Full-time', 'Full time', 'Tiempo completo', 'Jornada completa'], ['Freelance', 'Freelancer', 'Independiente']],
    modality: [['Remote', 'Remoto', 'Remota', 'Teletrabajo', 'A distancia', '100% remote']],
    yes: [['Yes', 'Sí', 'Si', 'True']], no: [['No', 'False']],
    experience: [['0', '0 years', '0 años', 'No experience', 'Sin experiencia', 'No professional experience']],
    availability: [['20', '20 hours/week', '20 hours per week', '20 horas semanales', '20 horas por semana']],
    skills: [['Software Development', 'Desarrollo de software'], ['Full-Stack Development', 'Full stack', 'Desarrollo full stack'], ['Backend Development', 'Backend', 'Desarrollo backend'],
      ['Database Design', 'Diseño de bases de datos'], ['Java'], ['Python'], ['JavaScript', 'JS'], ['React', 'React.js', 'ReactJS'], ['SQL'], ['PostgreSQL', 'Postgres'], ['Supabase'], ['H2'], ['Git'], ['GitHub'], ['Linux'], ['REST APIs', 'REST API', 'APIs REST'], ['HTML', 'HTML5'], ['CSS', 'CSS3']]
  };

  // 3. Normalización. Los signos + y - se preservan aparte al comparar zonas UTC.
  function normalize(value) {
    return String(value ?? '').replace(/([a-z])([A-Z])/g, '$1 $2').normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
  }
  const has = (text, phrase) => (` ${normalize(text)} `).includes(` ${normalize(phrase)} `);

  // 4. Detección de campos: fuentes fuertes primero, contexto local después.
  function rootTextByIds(el, attribute) {
    const root = el.getRootNode();
    return (el.getAttribute(attribute) || '').split(/\s+/).filter(Boolean)
      .map(id => root.getElementById?.(id)?.textContent || '').join(' ');
  }
  function questionContainer(el) {
    const explicit = el.closest('fieldset, [role="group"], [role="radiogroup"]');
    if (explicit) return explicit;
    let parent = el.parentElement;
    for (let i = 0; parent && i < 3; i++, parent = parent.parentElement) {
      if (parent.matches('form, body, html')) break;
      const controls = [...parent.querySelectorAll('input, textarea, select')];
      if (controls.length && controls.every(c => c === el ||
        (['radio', 'checkbox'].includes(el.type) && c.type === el.type && c.name === el.name))) return parent;
    }
    return el.parentElement;
  }
  function sources(el, grouped = false) {
    const result = [];
    const add = (method, text, weight) => { if (String(text || '').trim()) result.push({ method, text: String(text).trim(), weight }); };
    add('aria-label', el.getAttribute('aria-label'), 100);
    add('aria-labelledby', rootTextByIds(el, 'aria-labelledby'), 100);
    if (!grouped) add('label', [...(el.labels || [])].map(l => l.textContent).join(' '), 100);
    const container = questionContainer(el);
    const legend = container?.querySelector('legend, [data-question], .question, .field-label');
    add('pregunta/legend', legend?.textContent, 95);
    add('name', el.name, 85); add('id', el.id, 80);
    add('data-testid', el.getAttribute('data-testid') || el.getAttribute('data-test'), 65);
    const autocompleteAliases = { 'given-name': 'first name', 'additional-name': 'middle name',
      'family-name': 'last name', 'address-level2': 'city', 'address-level1': 'province',
      'country-name': 'country', tel: 'phone', 'tel-national': 'phone' };
    const token = (el.autocomplete || '').split(/\s+/).at(-1);
    add('tipo HTML/autocomplete', autocompleteAliases[token] || (el.type === 'email' ? 'email' : el.type === 'tel' ? 'phone' : ''), 90);
    if (!grouped) add('placeholder', el.getAttribute('placeholder'), 75);
    add('autocomplete', el.getAttribute('autocomplete')?.replace(/^(section-\S+\s+)?(shipping|billing)\s+/, ''), 85);
    add('aria-describedby', rootTextByIds(el, 'aria-describedby'), 55);
    // Sólo vecinos pequeños: nunca tomar todo el texto de un formulario/página.
    if (container && !container.matches('form, body, html') && container.textContent.length < 700) {
      const copy = container.cloneNode(true);
      copy.querySelectorAll('input, textarea, select, button, script, style').forEach(n => n.remove());
      if (grouped) copy.querySelectorAll('label').forEach(n => n.remove());
      add('texto cercano', copy.textContent, 45);
    }
    return result;
  }
  function detect(list) {
    const candidates = new Map();
    for (const source of list) {
      const hits = Object.entries(ALIASES).flatMap(([key, aliases]) => aliases
        .filter(a => has(source.text, a)).map(alias => ({ key, alias })));
      // "first name" es más específico que "name", "start availability" que "availability".
      const specific = hits.filter(a => !hits.some(b => b.key !== a.key && b.alias.length > a.alias.length && has(b.alias, a.alias)));
      for (const hit of specific) {
        const score = source.weight + Math.min(normalize(hit.alias).length, 30) / 100;
        if (!candidates.has(hit.key) || candidates.get(hit.key).score < score)
          candidates.set(hit.key, { ...hit, score, method: `${source.method}: ${source.text}` });
      }
    }
    const sorted = [...candidates.values()].sort((a, b) => b.score - a.score);
    if (!sorted.length) return { key: null, reason: 'Sin coincidencia confiable' };
    if (sorted[1] && Math.floor(sorted[0].score) === Math.floor(sorted[1].score))
      return { key: null, reason: `Campo ambiguo: ${sorted[0].key} / ${sorted[1].key}`, ambiguous: true };
    return sorted[0];
  }

  // 5. Idioma por pregunta; fallback al idioma del formulario/documento.
  function language(list, el) {
    const text = list.filter(s => s.weight >= 75).map(s => s.text).join(' ');
    if (/\b(nombre|apellido|correo|telefono|ciudad|pais|provincia|ubicacion|universidad|carrera|titulo|ano|ingles|disponibilidad|salario|pretension|remuneracion|mensaje|informacion|sobre|comentarios|modalidad|habilidades|autorizado|autorizada|patrocinio|necesita|requiere|puede|puedes|podes|trabajar|graduacion|egreso|semanal|experiencia)\b/.test(normalize(text))) return 'es';
    if (/\b(name|email|phone|city|country|university|degree|graduation|english|availability|salary|message|comments|sponsorship|authorized|work|skills|hours)\b/.test(normalize(text))) return 'en';
    const lang = el.closest('[lang]')?.lang || el.ownerDocument.documentElement.lang || navigator.language;
    return /^es\b/i.test(lang) ? 'es' : 'en';
  }

  // 6. Seguridad: jamás rellenar documentos, secretos, finanzas, consentimientos o archivos.
  function safety(el, list) {
    if (el.disabled || el.readOnly || el.closest('[inert]')) return 'Deshabilitado o sólo lectura';
    if (el.hidden || el.closest('[hidden], [aria-hidden="true"]') || !el.getClientRects().length) return 'Oculto';
    if (el.tagName === 'INPUT' && ['hidden', 'password', 'file', 'submit', 'button', 'reset', 'image', 'range', 'color'].includes(el.type)) return 'Tipo protegido/no editable';
    const text = normalize(list.map(s => s.text).join(' '));
    const protectedWords = /\b(dni|documento|documentos|document|documents|identification|identity|passport|pasaporte|cedula|cuit|cuil|ssn|social security|tax id|national id|national identification|id number|password|contrasena|pin|otp|verification code|codigo de verificacion|credit card|debit card|card|cardholder|tarjeta|card number|cvv|iban|swift|bank|banco|banking|bancaria|bancario|cuenta|account number|routing|payment|pago|birth|nacimiento|age|edad|gender|genero|sex|sexo|race|raza|ethnicity|etnia|religion|disability|discapacidad|medical|medico|health|salud|marital|civil|veteran|veterano|nationality|nacionalidad|citizenship|ciudadania|consent|consentimiento|terms|terminos|privacy|privacidad|captcha)\b/;
    if (protectedWords.test(text) || /^(cc-|current-password|new-password|one-time-code)/.test(el.autocomplete || '')) return 'Campo sensible o consentimiento: protegido';
    if (/\b(resume|cv|curriculum|introduction video|video de presentacion|video introductorio)\b/.test(text)) return 'CV/video: sin enlace público configurado';
    return null;
  }
  function occupied(el) {
    if (el.type === 'radio' || el.type === 'checkbox') return el.checked || el.indeterminate;
    if (el.tagName === 'SELECT') {
      return [...el.selectedOptions].some(o => o.value !== '' &&
        !/^(select|select one|select an option|choose|choose one|please select|seleccionar|seleccione|selecciona|elige|elegir|selecciona una opcion|seleccione una opcion)(\b|$)/.test(normalize(o.textContent)));
    }
    return String(el.value || '').trim() !== '';
  }
  function questionText(list) {
    // No usar las alternativas de un select ni el texto de otros campos como evidencia.
    return list.map(s => s.text).join(' ');
  }
  function resolve(key, list, lang, el) {
    const text = normalize(questionText(list));
    const review = reason => ({ review: reason });
    if (key === 'salary') {
      if (/\b(current|previous|last|existing|actual|previo|anterior|ultimo)\b/.test(text)) return review('Remuneración actual/anterior: no es la expectativa salarial');
      const periods = [
        [/\b(hourly|per hour|hour|por hora|hora)\b/, '15'],
        [/\b(monthly|per month|month|mensual|mes)\b/, '2000'],
        [/\b(annual|annually|yearly|per year|anual|ano)\b/, '24000']
      ].filter(([pattern]) => pattern.test(text));
      if (periods.length !== 1) return review('Salario sin período inequívoco');
      if (/\b(ars|eur|gbp|cad|aud|pesos|euros|libras|brl|reales)\b/.test(text)) return review('Moneda distinta de USD: no convertir ni asumir');
      return { value: periods[0][1], choices: [[periods[0][1], `USD ${periods[0][1]}`]] };
    }
    if (key === 'authorization') {
      if (!has(text, 'Argentina') || /\b(united states|usa|us|canada|europe|europa|spain|espana|uk|united kingdom|brasil|brazil|chile|uruguay|any country|cualquier pais|other countries|other country|otro pais|or|and|o|y|except|excepto)\b/.test(text))
        return review('Autorización laboral sin contexto exclusivo de Argentina');
      if (/\b(not|without|no|sin)\b/.test(text)) return review('Autorización laboral con negación: revisar');
      return { value: lang === 'es' ? 'Sí' : 'Yes', choices: CHOICES.yes };
    }
    if (key === 'sponsorship') {
      if (has(text, 'Argentina')) return review('Patrocinio en Argentina: revisar contexto');
      if (/\b(without sponsorship|without a sponsor|sin patrocinio|sin un patrocinador|sin sponsorship|sin sponsoreo)\b/.test(text) && /\b(work|trabajar)\b/.test(text))
        return { value: 'No', choices: CHOICES.no };
      const intent = text.replace(/\bnow or (in the )?future\b/g, 'now future')
        .replace(/\b(ahora|actualmente) o (en el )?futuro\b/g, 'ahora futuro');
      if (/\b(not|no|without|sin|exempt|except|or|excepto|unless|if|si|o)\b/.test(intent)) return review('Pregunta de patrocinio con negación o condición');
      if (/\b(require|requires|need|needs|requiere|requieres|requerira|necesita|necesitas|necesitare|necesitara|necesitaras|requeriras|requerir)\b/.test(text))
        return { value: lang === 'es' ? 'Sí' : 'Yes', choices: CHOICES.yes };
      return review('Pregunta de patrocinio sin intención clara');
    }
    if (key === 'availability' && !/\b(weekly|week|semanal|semanales|semana)\b/.test(text)) return review('Disponibilidad sin unidad semanal');
    if (key === 'degree' && /\b(completed|obtained|awarded|graduated|earned|terminada|completada|obtenido|obtenida|finalizada|graduado|graduada)\b/.test(text)) return review('Título ya obtenido: la carrera está en curso');
    if (key === 'experience' && DATA.skills.some(skill => has(text, skill))) return review('Experiencia en una tecnología: no se conoce cantidad de años');
    if (key === 'experience' && el.tagName !== 'SELECT' && !['radio', 'checkbox'].includes(el.type) &&
        !/\b(years|anos|formal|professional|profesional)\b/.test(text)) return review('Experiencia sin unidad o alcance claro');
    let value = DATA[key] ?? DATA[lang][key];
    if (key === 'skills') value = DATA.skills.join(', ');
    if (key === 'availability' && el.type === 'number') value = DATA.weeklyHours;
    if (key === 'experience' && (el.type === 'number' || /\b(years|anos)\b/.test(text))) value = DATA.experience;
    if (key === 'year' && el.type === 'number') value = '4';
    if (key === 'graduation') {
      if (el.type === 'month') value = '2028-07';
      else if (/\b(graduation year|ano de graduacion)\b/.test(text)) return { value: '2028', choices: [['2028']] };
      else if (/\b(graduation month|mes de graduacion)\b/.test(text)) return { value: lang === 'es' ? 'Julio' : 'July', choices: [['July', 'Julio', '7', '07']] };
      else if (el.type === 'date' || el.type === 'number') return review('Graduación: sólo se conoce mes y año');
    }
    if (key === 'start' && ['date', 'month', 'datetime-local', 'number'].includes(el.type)) return review('Inicio inmediato: confirmar fecha de calendario');
    if (el.type === 'number' && !/^-?\d+(\.\d+)?$/.test(value || '')) return review('El dato no tiene una representación numérica inequívoca');
    if (!value) return review('Sin dato configurado');
    return { value, choices: CHOICES[key] || [[value]] };
  }

  // 7. Aplicación con setters nativos y eventos para inputs controlados.
  function setNative(el, property, value) {
    const win = el.ownerDocument.defaultView;
    const proto = el.tagName === 'SELECT' ? win.HTMLSelectElement.prototype :
      el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, property)?.set;
    if (!setter) throw new Error(`Setter nativo no disponible: ${property}`);
    setter.call(el, value);
  }
  function emit(el) {
    const EventType = el.ownerDocument.defaultView.Event;
    for (const name of ['input', 'change', 'blur']) el.dispatchEvent(new EventType(name, { bubbles: true, composed: true }));
  }
  function applyText(el, resolved) {
    const value = resolved.value;
    if (el.maxLength >= 0 && value.length > el.maxLength) return 'Texto demasiado largo: no truncar información';
    // Validar sin tocar el campo real: evita revertir valores propios del sitio.
    const probe = el.cloneNode(false);
    probe.value = value;
    if (probe.value !== value || (probe.validity && !probe.validity.valid)) return 'Dato incompatible con formato, mínimo/máximo o patrón del campo';
    remember(el); setNative(el, 'value', value); emit(el); finishRemember(el);
    return el.value === value ? null : 'El sitio cambió/rechazó el valor; revisar';
  }

  // 8. Selects: equivalencia explícita antes de coincidencia contenida y sólo sin empate.
  function semanticScore(option, alternatives, key) {
    const label = option.textContent || '';
    const value = option.value || '';
    if (key === 'english' && /\b(native|nativo|nativa|c1|c2)\b/.test(normalize(label))) return 0;
    if (key === 'timezone' && /(?:UTC|GMT)\s*\+/i.test(label + ' ' + value)) return 0;
    for (const alternative of alternatives) {
      const target = normalize(alternative);
      if (target && normalize(label) === target) return 100;
    }
    // Etiquetas compuestas del mismo nivel (Advanced / B2) son equivalencias válidas.
    if (key === 'english') {
      const known = normalize(label).replace(/\b(advanced|avanzado|avanzada|b2|cambridge|first|fce|upper|intermediate|intermedio|alto|fluent|fluido|fluida|level|nivel|english|ingles|proficiency)\b/g, '').trim();
      if (!known && alternatives.some(a => has(label, a))) return 90;
    }
    // Un valor interno no debe contradecir la etiqueta que ve el usuario.
    if (alternatives.some(a => ['yes', 'si', 'true'].includes(normalize(a))) && has(label, 'No')) return 0;
    if (alternatives.some(a => ['no', 'false'].includes(normalize(a))) && (has(label, 'Yes') || has(label, 'Sí'))) return 0;
    const combined = /\b(or|and|hybrid|hibrido|hibrida|onsite|on site|presencial|native|nativo|not|no)\b/.test(normalize(label));
    if (combined || /[\/|]/.test(label)) return 0;
    for (const alternative of alternatives) {
      const target = normalize(alternative);
      if (target && normalize(value) === target) return 95;
    }
    // No aceptar "Remote / Hybrid", "Yes / No" ni Java como JavaScript.
    for (const alternative of alternatives) {
      const target = normalize(alternative);
      if (target.length >= 4 && has(label, target)) {
        const extra = normalize(label).replace(target, '').trim();
        if (/^(level|nivel|proficiency|certified|certificado|student|estudiante|preferred|preferido|only|solo|usd|utc|gmt|time zone|zona horaria|buenos aires|argentina|ar)$/.test(extra)) return 80;
      }
    }
    return 0;
  }
  function choose(options, resolved, key, multiple) {
    const chosen = [];
    for (const alternatives of resolved.choices) {
      const ranked = options.filter(o => !o.disabled && o.value !== '' && !o.closest?.('optgroup:disabled'))
        .map(option => ({ option, score: semanticScore(option, alternatives, key) })).filter(o => o.score > 0)
        .sort((a, b) => b.score - a.score);
      if (!ranked.length) continue;
      if (ranked[1]?.score === ranked[0].score) return { review: 'Varias opciones semánticamente equivalentes: revisar' };
      chosen.push(ranked[0].option);
      if (!multiple) break;
    }
    return chosen.length ? { chosen: [...new Set(chosen)] } : { review: 'Ninguna opción coincide de forma confiable' };
  }
  function applySelect(el, resolved, key) {
    const result = choose([...el.options], resolved, key, el.multiple);
    if (result.review) return result;
    remember(el);
    if (el.multiple) {
      const setter = Object.getOwnPropertyDescriptor(el.ownerDocument.defaultView.HTMLOptionElement.prototype, 'selected').set;
      for (const option of el.options) setter.call(option, result.chosen.includes(option));
    } else setNative(el, 'value', result.chosen[0].value);
    emit(el); finishRemember(el);
    const expected = result.chosen.map(o => o.value);
    if (expected.some(value => ![...el.selectedOptions].some(o => o.value === value))) return { review: 'El sitio rechazó la selección' };
    return { value: result.chosen.map(o => o.textContent.trim()).join(', ') };
  }

  // 9. Radios/checkboxes. Se conserva cualquier grupo con selección previa.
  function optionLabel(el) {
    return [...(el.labels || [])].map(l => {
      const copy = l.cloneNode(true);
      copy.querySelectorAll('input').forEach(n => n.remove());
      return copy.textContent;
    }).join(' ').trim() || el.getAttribute('aria-label') || el.value;
  }
  function groupFor(el, controls) {
    if (el.type === 'radio' && el.name) return controls.filter(c => c.type === el.type && c.name === el.name && c.form === el.form && c.getRootNode() === el.getRootNode());
    const container = questionContainer(el);
    return controls.filter(c => c.type === el.type && c.form === el.form && c.getRootNode() === el.getRootNode() &&
      (container?.contains(c)) && (el.type !== 'radio' || !c.name));
  }
  function applyGroup(group, resolved, key, list) {
    if (group[0].type === 'checkbox' && !['skills', 'employment', 'modality'].includes(key))
      return { review: 'Checkbox afirmativo/consentimiento: requiere selección manual' };
    if (group.some(c => safety(c, sources(c)))) return { review: 'Grupo con opciones protegidas, ocultas o deshabilitadas' };
    const options = group.map(el => ({ textContent: optionLabel(el), value: el.value, disabled: el.disabled, el }));
    const result = choose(options, resolved, key, group[0].type === 'checkbox');
    if (result.review) return result;
    for (const option of result.chosen) {
      // No click(): impide activar acciones o envíos asociados al click.
      remember(option.el); setNative(option.el, 'checked', true); emit(option.el); finishRemember(option.el);
    }
    if (result.chosen.some(o => !o.el.checked)) return { review: 'El sitio rechazó la selección' };
    return { value: result.chosen.map(o => o.textContent).join(', ') };
  }

  // 10. Enumeración: documento, shadow roots abiertos e iframes accesibles.
  function collect() {
    const controls = [], documents = [], roots = new Set();
    function visit(root) {
      if (root.host?.hasAttribute('data-pablo-autofill-ui')) return;
      if (roots.has(root)) return;
      roots.add(root);
      if (root.nodeType === 9) documents.push(root);
      controls.push(...[...root.querySelectorAll('input, textarea, select')].filter(el => !el.closest('[data-pablo-autofill-ui]')));
      for (const el of root.querySelectorAll('*')) {
        if (el.shadowRoot) visit(el.shadowRoot);
        if (el.tagName === 'IFRAME') {
          try { if (el.contentDocument) visit(el.contentDocument); } catch (_) { /* Otro origen: lo maneja su propia instancia. */ }
        }
      }
    }
    visit(document);
    return { controls, documents };
  }

  // 11. Registro: detección de contexto, contraseñas criptográficas y confirmación.
  function accountScope(el) {
    if (el.form) return el.form;
    const explicit = el.closest('[role="dialog"], [role="form"], section, article');
    if (explicit) return explicit;
    let node = el.parentElement;
    while (node && !node.matches('body, html')) {
      const passwords = node.querySelectorAll('input[type="password"], input[autocomplete="new-password"]');
      if (passwords.length && (passwords.length > 1 ||
          node.querySelector('input[type="email"], input[autocomplete="username"], input[name*="email" i]'))) return node;
      node = node.parentElement;
    }
    // Un campo aislado nunca hereda una cabecera de registro de toda la página.
    return el.parentElement || el.getRootNode();
  }
  function accountKind(el) {
    const text = normalize(sources(el).filter(s => s.weight >= 65).map(s => s.text).join(' '));
    const autocomplete = (el.autocomplete || '').split(/\s+/).at(-1);
    if (el.type === 'password' || autocomplete === 'new-password' || /\b(password|contrasena|clave|confirm password|repeat password)\b/.test(text))
      return /\b(confirm|confirmation|repeat|retype|confirmar|confirmacion|repetir|repite|confirmacion de|repeticion)\b/.test(text) ? 'passwordConfirm' : 'password';
    if ((has(text, 'email') || has(text, 'correo')) && /\b(phone|telefono|celular)\b/.test(text)) return null;
    if (el.type === 'email' || has(text, 'email') || has(text, 'correo')) return 'accountEmail';
    if (autocomplete === 'username' || /\b(username|user name|nombre de usuario|usuario|login)\b/.test(text)) return 'username';
    return null;
  }
  function registrationContext(scope, fields, mode) {
    const headings = [...scope.querySelectorAll('h1,h2,h3,legend,[role="heading"],button,input[type="submit"]')]
      .map(e => e.textContent || e.value || '').join(' ');
    const text = normalize(`${headings} ${scope.getAttribute?.('aria-label') || ''} ${scope.id || ''}`);
    const signup = /\b(sign up|signup|register|registration|create account|create an account|create your account|join now|crear cuenta|crear mi cuenta|crea tu cuenta|crea una cuenta|crear una cuenta|registrarse|registrarme|registrate|registro|alta de usuario)\b/.test(text);
    const login = /\b(sign in|signin|log in|login|iniciar sesion|inicia sesion|ingresar|acceder|reset password|forgot password|change password|restablecer|recuperar|cambiar contrasena)\b/.test(text);
    const current = fields.some(el => (el.autocomplete || '').split(/\s+/).at(-1) === 'current-password');
    const fresh = fields.some(el => (el.autocomplete || '').split(/\s+/).at(-1) === 'new-password');
    if (current || (login && !signup)) return { allowed: false, reason: 'Inicio de sesión/cambio de contraseña: no generar credenciales' };
    if (login && signup && !fresh) return { allowed: false, reason: 'Inicio de sesión y registro mezclados: seleccionar el formulario correspondiente' };
    if (signup || fresh || (mode === 'account' && fields.some(el => el.type === 'password')))
      return { allowed: true };
    return { allowed: false, reason: 'Sin evidencia de creación de cuenta; usar modo Cuenta si corresponde' };
  }
  function validValue(el, value) {
    const probe = el.cloneNode(false); probe.value = value;
    if (el.maxLength >= 0 && value.length > el.maxLength) return false;
    if (el.minLength > 0 && value.length < el.minLength) return false;
    return probe.value === value && (!probe.validity || probe.validity.valid);
  }
  function randomIndex(length) {
    const bytes = new Uint32Array(1);
    const limit = Math.floor(0x100000000 / length) * length;
    do { crypto.getRandomValues(bytes); } while (bytes[0] >= limit);
    return bytes[0] % length;
  }
  function makePassword(fields) {
    const lower = 'abcdefghijkmnopqrstuvwxyz', upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const digits = '23456789', symbols = '!@#$%*_+-';
    const minimum = Math.max(12, ...fields.map(e => Math.max(0, e.minLength)));
    const maximum = Math.min(128, ...fields.map(e => e.maxLength < 0 ? 128 : e.maxLength));
    if (minimum > maximum) return null;
    const length = Math.min(maximum, Math.max(ACCOUNT.passwordLength, minimum));
    // Reintentos acotados, respetando minlength/maxlength/pattern declarados.
    for (let attempt = 0; attempt < 180; attempt++) {
      const sets = attempt < 90 ? [lower, upper, digits, symbols] : [lower, upper, digits];
      const alphabet = sets.join('');
      const chars = sets.map(set => set[randomIndex(set.length)]);
      while (chars.length < length) chars.push(alphabet[randomIndex(alphabet.length)]);
      for (let i = chars.length - 1; i > 0; i--) {
        const j = randomIndex(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]];
      }
      const password = chars.join('');
      if (fields.every(el => validValue(el, password))) return password;
    }
    return null;
  }
  function registrationFill(controls, mode, log) {
    const handled = new Set();
    const scopes = new Map();
    for (const el of controls) {
      const kind = accountKind(el);
      if (!kind || safetyAccount(el)) continue;
      const scope = accountScope(el);
      if (!scopes.has(scope)) scopes.set(scope, []);
      scopes.get(scope).push(el);
    }
    for (const [scope, fields] of scopes) {
      const passwords = fields.filter(el => ['password', 'passwordConfirm'].includes(accountKind(el)));
      const context = registrationContext(scope, fields, mode);
      const jobContext = [...scope.querySelectorAll('input,textarea,select')].some(el =>
        ['salary', 'degree', 'university', 'academic', 'employment', 'experience'].includes(detect(sources(el)).key));
      if (!context.allowed && jobContext) {
        for (const el of passwords) {
          handled.add(el); log(el, { key: accountKind(el), method: 'contexto laboral' }, occupied(el) ? 'existing' : 'ignored', 'Contraseña sin evidencia de registro');
        }
        continue;
      }
      // Una suscripción/newsletter sin password no pasa a ser una cuenta por su email.
      if (!passwords.length && !context.allowed) continue;
      if (mode === 'job' || !context.allowed) {
        for (const el of fields) {
          handled.add(el);
          log(el, { key: accountKind(el), method: 'contexto de autenticación' }, occupied(el) ? 'existing' : 'ignored', context.reason || 'Modo laboral: registro excluido');
        }
        continue;
      }
      fields.forEach(el => handled.add(el));
      const emailFields = fields.filter(el => accountKind(el) === 'accountEmail');
      const userFields = fields.filter(el => accountKind(el) === 'username');
      const storedPasswords = [...new Set(passwords.filter(occupied).map(el => el.value))];
      const otherEmail = emailFields.some(el => occupied(el) && el.value.trim().toLowerCase() !== ACCOUNT.email);
      let password = storedPasswords.length === 1 ? storedPasswords[0] : accountSessions.get(scope)?.password;
      let problem = otherEmail ? 'Email existente diferente: se conserva y se revisan las credenciales' :
        storedPasswords.length > 1 ? 'Las contraseñas existentes no coinciden' : null;
      if (!problem && passwords.length && !password) password = makePassword(passwords);
      if (!problem && passwords.length && (!password || !passwords.every(el => validValue(el, password))))
        problem = 'Restricciones de contraseña incompatibles: completar manualmente';
      const session = { email: ACCOUNT.email, password: password || '', origin: location.origin,
        username: userFields.find(occupied)?.value || (userFields.length ? ACCOUNT.email.split('@')[0] : '') };
      if (!problem) accountSessions.set(scope, session);
      for (const el of fields) {
        const kind = accountKind(el);
        const detection = { key: kind, method: 'registro EN/ES + tipo/autocomplete/label' };
        if (occupied(el)) { log(el, detection, 'existing', 'Se conserva el dato existente'); continue; }
        if (problem) { log(el, detection, 'review', problem); continue; }
        let value;
        if (kind === 'accountEmail') value = ACCOUNT.email;
        else if (kind === 'username') {
          const hint = normalize(sources(el).filter(s => s.weight >= 75).map(s => s.text).join(' '));
          value = el.type === 'email' || /\b(email|correo)\b/.test(hint) ? ACCOUNT.email : ACCOUNT.email.split('@')[0];
        } else value = password;
        if (!value) { log(el, detection, 'review', 'No se generó contraseña'); continue; }
        const review = applyText(el, { value });
        log(el, detection, review ? 'review' : 'filled', review, kind.startsWith('password') ? '•••••••• (oculta)' : value);
      }
      if (!problem && password && passwords.every(el => el.value === password)) {
        // Sólo ofrecer credenciales generadas por el script; no revelar contraseñas previas.
        if (!storedPasswords.length || recentCredentials?.password === password) recentCredentials = session;
      }
    }
    return handled;
  }
  function safetyAccount(el) {
    if (el.tagName !== 'INPUT' || !['email', 'text', 'password'].includes(el.type)) return true;
    if (el.disabled || el.readOnly || el.hidden || el.closest('[hidden],[inert],[aria-hidden="true"]') || !el.getClientRects().length) return true;
    const autocomplete = (el.autocomplete || '').split(/\s+/).at(-1);
    if (autocomplete === 'one-time-code' || autocomplete?.startsWith('cc-')) return true;
    // La excepción autorizada es password de registro; los demás campos siguen protegidos.
    const text = normalize(sources(el).filter(s => s.weight >= 65).map(s => s.text).join(' '));
    return /\b(otp|pin|dni|passport|pasaporte|ssn|card|tarjeta|bank|banco|iban|cvv|verification|verificacion|captcha)\b/.test(text);
  }

  // 12. Historial de la última ejecución. Deshacer sólo si el usuario no cambió el valor.
  function snapshot(el) {
    if (el.tagName === 'SELECT') return [...el.options].map(o => o.selected);
    if (['radio', 'checkbox'].includes(el.type)) return el.checked;
    return el.value;
  }
  function remember(el) {
    if (!history.some(item => item.el === el)) history.push({ el, before: snapshot(el), after: null });
  }
  function finishRemember(el) { const item = history.find(item => item.el === el); if (item) item.after = snapshot(el); }
  function undo() {
    let restored = 0, skipped = 0;
    for (const item of [...history].reverse()) {
      const { el, before, after } = item;
      if (!el.isConnected || after === null || JSON.stringify(snapshot(el)) !== JSON.stringify(after)) { skipped++; continue; }
      if (el.tagName === 'SELECT') {
        if (el.options.length !== before.length) { skipped++; continue; }
        const setter = Object.getOwnPropertyDescriptor(el.ownerDocument.defaultView.HTMLOptionElement.prototype, 'selected').set;
        [...el.options].forEach((o, i) => setter.call(o, before[i]));
      } else setNative(el, ['radio', 'checkbox'].includes(el.type) ? 'checked' : 'value', before);
      emit(el); restored++;
    }
    history = [];
    statusMessage(`${restored} campos restaurados · ${skipped} modificados o inaccesibles se conservaron`);
  }

  // 13. Controles en el menú de Violentmonkey: ningún panel flotante.
  function statusMessage(text) { console.info('[Pablo Autofill]', text); }
  function registerCommands() {
    if (typeof GM_registerMenuCommand !== 'function') return;
    const prefix = 'Pablo Autofill — ';
    GM_registerMenuCommand(prefix + 'Automático', () => run('auto'));
    GM_registerMenuCommand(prefix + 'Laboral', () => run('job'));
    GM_registerMenuCommand(prefix + 'Crear cuenta', () => run('account'));
    GM_registerMenuCommand(prefix + 'Deshacer última ejecución', undo);
    GM_registerMenuCommand(prefix + 'Ver revisión en consola', () => {
      const rows = lastReport.filter(row => row.estado === 'requiere revisión');
      if (rows.length) console.table(rows);
      else statusMessage('No hay campos marcados para revisión.');
    });
    GM_registerMenuCommand(prefix + 'Copiar contraseña de registro', () => {
      if (!recentCredentials?.password) {
        statusMessage('Todavía no hay una contraseña de registro aplicada en esta página.'); return;
      }
      if (typeof GM_setClipboard !== 'function') {
        statusMessage('La API de portapapeles no está disponible. Revisá los permisos del script.'); return;
      }
      try { GM_setClipboard(recentCredentials.password, 'text'); statusMessage('Contraseña copiada.'); }
      catch (_) { statusMessage('No se pudo copiar la contraseña. Revisá los permisos del script.'); }
    });
  }

  // 14. Notificación y logs: nunca registrar contraseñas ni valores preexistentes.
  function notify(counts) {
    const id = 'pablo-job-autofill-notification';
    document.getElementById(id)?.remove();
    const host = document.createElement('div'); host.id = id;
    host.style.cssText = 'position:fixed;top:16px;right:16px;z-index:2147483647;max-width:calc(100vw - 32px)';
    const shadow = host.attachShadow({ mode: 'open' });
    const toast = document.createElement('div');
    toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
    toast.style.cssText = 'background:#172033;color:white;padding:12px 16px;border-radius:10px;font:13px/1.5 system-ui,sans-serif;box-shadow:0 4px 20px #0004;max-width:390px';
    toast.textContent = `${counts.filled} completados · ${counts.existing} ya tenían contenido · ${counts.review} requieren revisión`;
    const close = document.createElement('button'); close.type = 'button'; close.textContent = '×';
    close.setAttribute('aria-label', 'Cerrar notificación');
    close.style.cssText = 'margin-left:12px;background:transparent;border:0;color:white;font-size:18px;cursor:pointer';
    close.addEventListener('click', () => host.remove()); toast.append(close); shadow.append(toast);
    (document.body || document.documentElement).append(host); setTimeout(() => host.remove(), 10000);
  }
  let running = false;
  function run(mode = 'auto') {
    if (running) return;
    running = true;
    history = [];
    const rows = [], counts = { filled: 0, existing: 0, review: 0, ignored: 0 };
    const visited = new Set();
    function log(el, detection, status, reason, value = '') {
      counts[status]++;
      rows.push({ campo: detection.key || el.name || el.id || el.tagName.toLowerCase(),
        valor_aplicado: value, metodo: detection.method || '',
        estado: { filled: 'completado', existing: 'ya tenía contenido', review: 'requiere revisión', ignored: 'ignorado' }[status], motivo: reason || '' });
    }
    try {
      const { controls } = collect();
      const accountHandled = registrationFill(controls, mode, log);
      for (const el of controls) {
        if (visited.has(el) || accountHandled.has(el)) continue;
        if (mode === 'account' && !accountHandled.size) continue;
        if (mode === 'account' && ![...accountHandled].some(c => accountScope(c) === accountScope(el))) continue;
        try {
          const grouped = ['radio', 'checkbox'].includes(el.type);
          const group = grouped ? groupFor(el, controls) : [el];
          if (!group.length) group.push(el);
          group.forEach(c => visited.add(c));
          const list = sources(el, grouped);
          const detection = detect(list);
          const blocked = safety(el, list);
          if (blocked) { log(el, detection, 'ignored', blocked); continue; }
          if (group.some(occupied)) { log(el, detection, 'existing', 'Se conserva el valor/selección existente'); continue; }
          if (!detection.key) { log(el, detection, detection.ambiguous ? 'review' : 'ignored', detection.reason); continue; }
          const resolved = resolve(detection.key, list, language(list, el), el);
          if (resolved.review) { log(el, detection, 'review', resolved.review); continue; }
          let result;
          if (grouped) result = applyGroup(group, resolved, detection.key, list);
          else if (el.tagName === 'SELECT') result = applySelect(el, resolved, detection.key);
          else {
            const review = applyText(el, resolved);
            result = review ? { review } : { value: resolved.value };
          }
          log(el, detection, result.review ? 'review' : 'filled', result.review, result.value);
        } catch (error) { log(el, { key: null }, 'review', `Error local: ${error.message}`); }
      }
      console.groupCollapsed('[Pablo Autofill] Resultados (filas de radio/checkbox = grupos)');
      console.table(rows); console.info('Resumen:', counts);
      console.info('CV/video, documentos, finanzas y consentimientos permanecen sin completar. Contraseñas: sólo creación de cuenta. Controles personalizados y marcos no accesibles pueden requerir revisión manual.');
      console.groupEnd(); notify(counts);
      lastReport = rows;
    } finally { running = false; }
  }

  // 15. Hotkey. Captura también teclas dentro de shadow roots y marcos del mismo origen.
  function onKey(event) {
    if (!event.ctrlKey || !event.shiftKey || event.altKey || event.metaKey || event.repeat || event.isComposing ||
        !(event.code === 'KeyF' || event.key?.toLowerCase() === 'f')) return;
    event.preventDefault(); event.stopImmediatePropagation(); run();
  }
  const wired = new WeakSet();
  function wireDocument(doc) {
    if (wired.has(doc)) return;
    wired.add(doc);
    doc.addEventListener('keydown', onKey, true);
    const wireFrames = root => {
      for (const node of root.querySelectorAll('*')) {
        if (node.shadowRoot) wireFrames(node.shadowRoot);
        if (node.tagName === 'IFRAME') {
          const attach = () => { try { if (node.contentDocument) wireDocument(node.contentDocument); } catch (_) { /* cross-origin */ } };
          attach(); node.addEventListener('load', attach);
        }
      }
    };
    wireFrames(doc);
    const observer = new MutationObserver(records => {
      for (const record of records) for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.tagName === 'IFRAME') {
          const attach = () => { try { if (node.contentDocument) wireDocument(node.contentDocument); } catch (_) { /* cross-origin */ } };
          attach(); node.addEventListener('load', attach);
        }
        wireFrames(node);
      }
    });
    observer.observe(doc.documentElement, { childList: true, subtree: true });
  }
  // Evita dos ejecuciones cuando Tampermonkey inyecta también en un iframe accesible.
  let accessibleParent = false;
  try { accessibleParent = window !== window.parent && !!window.parent.document.documentElement; } catch (_) { /* otro origen */ }
  if (!accessibleParent) { wireDocument(document); registerCommands(); }
})();
