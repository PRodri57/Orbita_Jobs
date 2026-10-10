import { JobApplication } from '../types/job';

export const INITIAL_JOB_APPLICATIONS: JobApplication[] = [
  {
    id: 'app-1',
    company: 'Mercado Libre',
    position: 'Frontend Engineer (React / TypeScript)',
    location: 'Buenos Aires / Híbrido',
    modality: 'hybrid',
    salary: '$3,800 - $4,200 USD',
    jobUrl: 'https://mercadolibre.com/careers',
    status: 'interviewing',
    priority: 'high',
    appliedDate: '2026-09-28',
    expectedResponseDate: '2026-10-12',
    contactName: 'Lucía Fernández',
    contactEmail: 'lucia.fernandez@mercadolibre.com',
    contactRole: 'Lead Technical Recruiter',
    notes: 'Gran interés en su equipo de Core UX y Design Systems. Mencionaron beneficios de bono anual y esquema híbrido 2 días en oficina.',
    tags: ['React', 'TypeScript', 'Design Systems', 'Fintech'],
    interviews: [
      {
        id: 'int-1-1',
        title: 'Screening con People & Cultura',
        date: '2026-10-02',
        time: '11:00',
        durationMinutes: 30,
        interviewers: 'Lucía Fernández',
        completed: true,
        notes: 'Conversamos sobre expectativas salariales y experiencia previa con micro-frontends.',
        feedback: 'Feedback positivo, pasé a ronda técnica en vivo.'
      },
      {
        id: 'int-1-2',
        title: 'Entrevista Técnica en Vivo & Arquitectura',
        date: '2026-10-12',
        time: '15:30',
        durationMinutes: 60,
        interviewers: 'Martín Rossi (Staff Engineer)',
        meetingLink: 'https://meet.google.com/abc-meli-tech',
        completed: false,
        notes: 'Repasar conceptos de renderizado concurrente, performance profiling y Web Workers.'
      }
    ],
    reminders: [
      {
        id: 'rem-1-1',
        type: 'interview_prep',
        title: 'Preparar ejercicios de optimización de bundle y preguntas para Martín',
        dueDate: '2026-10-11',
        completed: false,
        notes: 'Revisar notas sobre React Server Components y caché'
      },
      {
        id: 'rem-1-2',
        type: 'thank_you_note',
        title: 'Enviar correo de agradecimiento post-técnica a Martín y Lucía',
        dueDate: '2026-10-13',
        completed: false,
        suggestedTemplateKey: 'thank_you_technical'
      }
    ],
    createdAt: '2026-09-28T10:00:00.000Z',
    updatedAt: '2026-10-02T16:00:00.000Z'
  },
  {
    id: 'app-2',
    company: 'Nubank',
    position: 'Senior Product Engineer',
    location: 'Remoto (América Latina)',
    modality: 'remote',
    salary: '$5,000 - $5,800 USD',
    jobUrl: 'https://nubank.com.br/careers',
    status: 'technical_test',
    priority: 'high',
    appliedDate: '2026-09-22',
    expectedResponseDate: '2026-10-14',
    contactName: 'Carlos Mendonça',
    contactEmail: 'carlos.m@nubank.com',
    contactRole: 'Talent Acquisition Partner',
    notes: 'Posición remota global con foco en productos de inversión y tarjetas de crédito internacionales.',
    tags: ['Clojure/React', 'Remote', 'Fintech', 'Inglés'],
    interviews: [
      {
        id: 'int-2-1',
        title: 'Llamada de Calibración & Fit Cultural',
        date: '2026-09-30',
        time: '14:00',
        durationMinutes: 45,
        interviewers: 'Carlos Mendonça & Mariana Silva',
        completed: true,
        notes: 'Todo en inglés. Evaluaron cómo manejo conflictos técnicos y priorización.'
      }
    ],
    reminders: [
      {
        id: 'rem-2-1',
        type: 'submit_assignment',
        title: 'Entregar prueba técnica de Dashboard Financiero en GitHub',
        dueDate: '2026-10-10',
        completed: false,
        notes: 'Falta pulir los tests unitarios con Vitest y redactar el README.',
        suggestedTemplateKey: 'assignment_submitted'
      },
      {
        id: 'rem-2-2',
        type: 'follow_up_status',
        title: 'Verificar recepción de entrega con Carlos si no confirman en 48h',
        dueDate: '2026-10-13',
        completed: false,
        suggestedTemplateKey: 'follow_up_status'
      }
    ],
    createdAt: '2026-09-22T14:30:00.000Z',
    updatedAt: '2026-10-05T09:15:00.000Z'
  },
  {
    id: 'app-3',
    company: 'Stripe',
    position: 'Fullstack Solutions Engineer',
    location: 'Remoto / Hub Regional',
    modality: 'remote',
    salary: '$6,200 - $7,000 USD + RSU',
    jobUrl: 'https://stripe.com/jobs',
    status: 'offer',
    priority: 'high',
    appliedDate: '2026-09-10',
    expectedResponseDate: '2026-10-16',
    contactName: 'Elena Rostova',
    contactEmail: 'erostova@stripe.com',
    contactRole: 'Senior Staff Recruiter',
    notes: '¡Oferta formal extendida el 8 de Octubre! Incluye seguro médico completo, estipendio de home office y asignación de acciones.',
    tags: ['Fullstack', 'APIs', 'SaaS', 'Oferta'],
    interviews: [
      {
        id: 'int-3-1',
        title: 'Screening Inicial',
        date: '2026-09-15',
        time: '16:00',
        durationMinutes: 30,
        interviewers: 'Elena Rostova',
        completed: true
      },
      {
        id: 'int-3-2',
        title: 'Prueba de API y Arquitectura Distribuida',
        date: '2026-09-23',
        time: '15:00',
        durationMinutes: 90,
        interviewers: 'David Kim (Engineering Manager)',
        completed: true
      },
      {
        id: 'int-3-3',
        title: 'Entrevista Final con Director de Ingeniería',
        date: '2026-10-04',
        time: '17:00',
        durationMinutes: 45,
        interviewers: 'Sophia Chen',
        completed: true,
        feedback: 'Gran química técnica y excelente entendimiento de idempotencia en pagos.'
      }
    ],
    reminders: [
      {
        id: 'rem-3-1',
        type: 'custom',
        title: 'Revisar cláusulas de stock options y beneficios antes del lunes',
        dueDate: '2026-10-12',
        completed: false,
        notes: 'Verificar período de vesting y fecha de inicio sugerida (1 de Noviembre).'
      },
      {
        id: 'rem-3-2',
        type: 'custom',
        title: 'Enviar confirmación / aceptación de oferta a Elena',
        dueDate: '2026-10-14',
        completed: false,
        suggestedTemplateKey: 'accept_offer'
      }
    ],
    createdAt: '2026-09-10T08:00:00.000Z',
    updatedAt: '2026-10-08T18:20:00.000Z'
  },
  {
    id: 'app-4',
    company: 'Globant',
    position: 'Tech Lead Web / Cloud',
    location: 'Bogotá / Ciudad de México / Remoto',
    modality: 'remote',
    salary: '$4,000 - $4,600 USD',
    jobUrl: 'https://globant.com/careers',
    status: 'review',
    priority: 'medium',
    appliedDate: '2026-10-03',
    expectedResponseDate: '2026-10-13',
    contactName: 'Andrés Morales',
    contactEmail: 'andres.morales@globant.com',
    contactRole: 'Tech Recruiter',
    notes: 'Postulación a través de LinkedIn. Me escribió Andrés diciendo que compartieron mi perfil con el Studio de Cloud.',
    tags: ['Tech Lead', 'Node.js', 'AWS', 'Remoto'],
    interviews: [],
    reminders: [
      {
        id: 'rem-4-1',
        type: 'follow_up_status',
        title: 'Hacer seguimiento con Andrés si no hay respuesta para el 14 de Octubre',
        dueDate: '2026-10-14',
        completed: false,
        suggestedTemplateKey: 'follow_up_status'
      }
    ],
    createdAt: '2026-10-03T11:20:00.000Z',
    updatedAt: '2026-10-03T11:20:00.000Z'
  },
  {
    id: 'app-5',
    company: 'Auth0 by Okta',
    position: 'Software Engineer II - Identity Platform',
    location: 'Remoto',
    modality: 'remote',
    salary: '$4,500 - $5,200 USD',
    jobUrl: 'https://auth0.com/careers',
    status: 'applied',
    priority: 'medium',
    appliedDate: '2026-10-06',
    expectedResponseDate: '2026-10-16',
    notes: 'Postulado en su portal oficial de Greenhouse. Subí CV adaptado con enfoque en OAuth y protocolos de seguridad.',
    tags: ['Security', 'OAuth', 'TypeScript', 'Node.js'],
    interviews: [],
    reminders: [
      {
        id: 'rem-5-1',
        type: 'follow_up_status',
        title: 'Verificar estado en Greenhouse tras 10 días hábiles',
        dueDate: '2026-10-19',
        completed: false,
        suggestedTemplateKey: 'follow_up_status'
      }
    ],
    createdAt: '2026-10-06T09:45:00.000Z',
    updatedAt: '2026-10-06T09:45:00.000Z'
  },
  {
    id: 'app-6',
    company: 'Kavak',
    position: 'Senior Frontend Developer',
    location: 'Ciudad de México / Híbrido',
    modality: 'hybrid',
    salary: '$75,000 - $85,000 MXN',
    jobUrl: 'https://kavak.com/trabaja-con-nosotros',
    status: 'rejected',
    priority: 'low',
    appliedDate: '2026-09-05',
    notes: 'Proceso cerrado. Agradecieron la participación y señalaron que se inclinaron por un candidato con experiencia específica en React Native presencial.',
    tags: ['Mobile', 'React Native', 'E-commerce'],
    interviews: [
      {
        id: 'int-6-1',
        title: 'Screening con Recruiter',
        date: '2026-09-12',
        time: '10:00',
        durationMinutes: 30,
        interviewers: 'Brenda López',
        completed: true
      }
    ],
    reminders: [],
    createdAt: '2026-09-05T13:00:00.000Z',
    updatedAt: '2026-09-20T10:00:00.000Z'
  }
];
