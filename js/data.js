// Static content: Fidélitas Psicología study plan and seed recipes.

const PLAN_VERSION = 2;

const ELECTIVA_OPTIONS = [
  'Competencias en Comunicación',
  'Inteligencia Emocional',
  'Transformación Digital',
  'Principios del Desarrollo de Emprendedores',
  'Habilidades de Liderazgo',
  'Pensamiento Crítico',
  'Pensamiento Creativo',
];

const OPTATIVA_OPTIONS = [
  'Evaluación Social y Económica de los Proyectos',
  'Inteligencia Artificial',
  'Herramientas Informáticas I',
];

const PLAN_COURSES = [
  [
    { name: 'Introducción a la Psicología', code: 'PS-101' },
    { name: 'Introducción a la Neurociencia', code: 'PS-501' },
    'Técnicas de Investigación Psicosocial',
    { name: 'Inteligencia Emocional', code: 'BEPR-602B', choice: 'electiva' },
  ],
  [
    'Enfoque de la Psicología I',
    'Psicología del Desarrollo I: Embarazo e Infancia',
    'Neurociencia y Psicología',
    'Investigación Psicológica I: Psicoestadística Descriptiva',
  ],
  [
    'Enfoque de la Psicología II',
    'Psicología del Desarrollo II: Adolescencia, Adultez y Vejez',
    'Introducción a la Psicopatología',
    'Investigación Psicológica II: Psicoestadística Inferencial',
  ],
  [
    'Psicología Social',
    'Técnicas de Entrevista Psicológica',
    'Psicopatología I',
    'Psicometría: Diseño y Construcción de Pruebas Psicológicas',
  ],
  [
    'Psicología Educativa y Neuroeducación',
    'Psicodiagnóstico de la Infancia',
    'Psicopatología II',
    'Fundamentos de Administración y Gerencia',
  ],
  [
    'Psicología del Aprendizaje',
    'Psicoterapia Infantil',
    'Psicodiagnóstico de la Persona Adulta',
    'Introducción a la Psicología Industrial y Organizacional',
  ],
  [
    'Prevención de la Violencia',
    'Dinámica de Grupos',
    'Psicoterapia de la Persona Adulta',
    'Gestión del Talento Humano en las Organizaciones',
  ],
  [
    'Psicología Ambiental',
    'Investigación Psicológica III: Métodos Cualitativos',
    'Psicología Integral de Adolescente',
    'Psicometría Laboral',
    { name: 'Optativa 1', choice: 'optativa' },
  ],
  [
    'Psicología de las Adicciones',
    'Terapia de Pareja y Familia',
    'Intervención en Crisis',
    'Práctica Hospitalaria',
    'Técnicas de Intervención Cognitivo Conductuales Aplicadas a la Psicología de la Salud',
  ],
];

function buildPlanTerms() {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX'];
  return PLAN_COURSES.map((list, i) => ({
    id: `p${i + 1}`,
    name: `${roman[i]} Cuatrimestre${i === 0 ? ' 2027' : ''}`,
    start: i === 0 ? '2027-01-11' : '',
    end: i === 0 ? '2027-04-24' : '',
    courses: list.map((c, j) => {
      const o = typeof c === 'string' ? { name: c } : c;
      return {
        id: `p${i + 1}c${j + 1}`,
        code: o.code || '',
        name: o.name,
        choice: o.choice || '',
        status: 'planned',
        grade: '',
      };
    }),
  }));
}

const FLAN_STEPS = [
  'Caramelize the 1 cup of sugar in a pan over medium heat until amber, then pour it into the loaf pan and tilt to coat the bottom.',
  'Gently whisk the egg yolks with both milks, the flavor ingredients and the vanilla, without making foam.',
  'Strain the mixture through a fine sieve into the caramelized pan.',
  'Cover tightly with foil and cook in a water bath (steamer or oven at about 160 °C / 325 °F) for 50–60 minutes, until set with a slight wobble.',
  'Cool, chill at least 4 hours, run a knife around the edge and unmold onto a serving plate.',
];

const FLAN_NOTE = 'Ingredients from Chef Zouheir (@chef_zouheir on Instagram). The method is the standard leche flan technique, not taken from the post.';

function flanRecipe(id, name, subtitle, yolks, extras, note) {
  return {
    id: `seed-flan-${id}`,
    name,
    tags: ['dessert', 'flan', subtitle, 'Chef Zouheir'],
    ingredients: [
      '1 cup sugar (for caramel)',
      `${yolks} egg yolks`,
      '1 can (397 g) condensed milk',
      '1 can (370 ml) evaporated milk',
      ...extras,
      '1 tsp vanilla extract',
    ],
    steps: FLAN_STEPS.slice(),
    note: note || FLAN_NOTE,
  };
}

const SEED_RECIPES = [
  flanRecipe('classic', 'Classic Leche Flan Loaf', 'creamy & traditional', 10, []),
  flanRecipe('ube', 'Ube Loaf Flan', 'velvety & unique', 8, ['1/2 cup ube halaya (purple yam)']),
  flanRecipe('coconut', 'Coconut Loaf Flan', 'tropical & creamy', 8, [
    '1/2 cup coconut milk',
    '1/2 cup shredded young coconut (macapuno, optional)',
  ]),
  flanRecipe('mango', 'Mango Loaf Flan', 'fruity & refreshing', 8, ['1/2 cup mango puree (ripened mango)']),
  flanRecipe('chocolate', 'Chocolate Loaf Flan', 'rich & decadent', 8, [
    '1/4 cup unsweetened cocoa powder',
    '1/2 cup melted dark chocolate (amount partly hidden in the source image, please verify)',
  ], `${FLAN_NOTE} Part of the chocolate card was covered in the screenshot, so double-check the chocolate line.`),
  flanRecipe('coffee', 'Coffee Loaf Flan', 'aromatic & smooth', 8, [
    '2 tbsp instant coffee',
    '2 tbsp hot water (to dissolve coffee)',
  ]),
];
