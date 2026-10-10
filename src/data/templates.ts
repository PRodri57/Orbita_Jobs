export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  body: string;
}

export const EMAIL_TEMPLATES: EmailTemplate[] = [
  {
    id: 'thank_you_initial',
    name: 'Agradecimiento post-primera entrevista',
    description: 'Enviar 24h después de la primera entrevista con RRHH o reclutador.',
    subject: 'Agradecimiento por la entrevista - {POSICION} en {EMPRESA}',
    body: `Hola {RECLUTADOR},

Muchas gracias por tu tiempo y la enriquecedora conversación de hoy sobre la posición de {POSICION} en {EMPRESA}.

Me entusiasma aún más la oportunidad de sumarme al equipo, especialmente después de conocer los desafíos y objetivos que tienen previstos para este rol. Considero que mi experiencia y motivación se alinean estrechamente con lo que están buscando.

Quedo a tu total disposición ante cualquier documentación adicional o consulta que requieras para las siguientes etapas.

Un cordial saludo,
{MI_NOMBRE}`
  },
  {
    id: 'thank_you_technical',
    name: 'Agradecimiento post-entrevista técnica',
    description: 'Enviar tras la entrevista técnica o presentación de desafío.',
    subject: 'Seguimiento entrevista técnica - {POSICION} - {EMPRESA}',
    body: `Estimado/a {RECLUTADOR},

Quería agradecerte a ti y al equipo técnico por el espacio brindado en la sesión de hoy. Disfruté mucho profundizar en los desafíos arquitectónicos y técnicos del proyecto.

Confirmé mi interés en colaborar y aportar soluciones de calidad a los proyectos de {EMPRESA}. Si necesitan profundizar en algún punto conversado o revisar material adicional, con gusto lo facilitaré.

Quedo atento a las próximas novedades del proceso.

Saludos cordiales,
{MI_NOMBRE}`
  },
  {
    id: 'follow_up_status',
    name: 'Seguimiento tras 5 a 7 días sin respuesta',
    description: 'Consulta cordial sobre el avance del proceso si no has recibido novedades.',
    subject: 'Seguimiento de postulación - {POSICION} - {EMPRESA}',
    body: `Hola {RECLUTADOR},

Espero que estés teniendo una excelente semana.

Me pongo en contacto para consultar si hay alguna novedad o actualización respecto al proceso de selección para la vacante de {POSICION}, en el cual tuve el agrado de participar recientemente.

Sigo sumamente interesado en la oportunidad y en formar parte del equipo de {EMPRESA}.

Muchas gracias nuevamente por tu tiempo y consideración.

Atentamente,
{MI_NOMBRE}`
  },
  {
    id: 'assignment_submitted',
    name: 'Entrega de prueba técnica / challenge',
    description: 'Para enviar la resolución del ejercicio o desafío técnico con enlaces.',
    subject: 'Entrega de prueba técnica - {POSICION} - {MI_NOMBRE}',
    body: `Hola {RECLUTADOR},

Espero que te encuentres muy bien.

Te comparto la resolución del desafío técnico solicitado para la posición de {POSICION} en {EMPRESA}.

Adjunto el repositorio y la demo funcional:
• Repositorio / Código: [INSERTAR ENLACE DE GITHUB]
• Demo desplegada: [INSERTAR ENLACE DE DEMO]
• Breve resumen de decisiones técnicas: [Punto clave 1, Punto clave 2]

He incluido documentación en el README con las instrucciones de ejecución y consideraciones de diseño.

Quedo a disposición para responder cualquier consulta o presentar la solución en una llamada técnica.

¡Un saludo!
{MI_NOMBRE}`
  },
  {
    id: 'accept_offer',
    name: 'Aceptación formal de propuesta / oferta laboral',
    description: 'Para confirmar formalmente que aceptas la oferta laboral recibida.',
    subject: 'Aceptación de oferta de empleo - {POSICION} - {MI_NOMBRE}',
    body: `Estimado/a {RECLUTADOR},

Es un gran placer confirmar formalmente mi aceptación de la oferta de trabajo para la posición de {POSICION} en {EMPRESA}.

Acepto con mucho entusiasmo los términos acordados. Estoy listo para comenzar el proceso de incorporación en la fecha prevista ({FECHA_INICIO}).

Por favor indícame los siguientes pasos y la documentación necesaria que deba presentar para coordinar mi ingreso.

Agradezco profundamente la confianza brindada.

Saludos afectuosos,
{MI_NOMBRE}`
  }
];

export function fillTemplate(
  template: EmailTemplate,
  variables: {
    empresa: string;
    posicion: string;
    reclutador?: string;
    miNombre?: string;
    fechaInicio?: string;
  }
): { subject: string; body: string } {
  let sub = template.subject
    .replace(/{EMPRESA}/g, variables.empresa || '[Empresa]')
    .replace(/{POSICION}/g, variables.posicion || '[Puesto]')
    .replace(/{MI_NOMBRE}/g, variables.miNombre || '[Mi Nombre]');

  let body = template.body
    .replace(/{EMPRESA}/g, variables.empresa || '[Empresa]')
    .replace(/{POSICION}/g, variables.posicion || '[Puesto]')
    .replace(/{RECLUTADOR}/g, variables.reclutador || 'Equipo de Selección')
    .replace(/{MI_NOMBRE}/g, variables.miNombre || '[Mi Nombre]')
    .replace(/{FECHA_INICIO}/g, variables.fechaInicio || '[Fecha de inicio]');

  return { subject: sub, body };
}
