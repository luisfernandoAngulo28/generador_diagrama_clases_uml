import type { UmlModel } from '../types/uml';

export interface GherkinScenario {
  title: string;
  given: string;
  when: string;
  then: string;
}

export interface UserStory {
  id: string;
  code: string; // e.g. "HU-01"
  className: string;
  title: string;
  role: string;
  want: string;
  soThat: string;
  priority: 'Alta' | 'Media' | 'Baja';
  storyPoints: number;
  scenarios: GherkinScenario[];
}

/**
 * Derives a logical business persona based on class names and system domains.
 */
function inferRoleForClass(className: string): string {
  const lower = className.toLowerCase();
  if (lower.includes('admin') || lower.includes('config') || lower.includes('parametro')) {
    return 'Administrador del Sistema';
  }
  if (lower.includes('cliente') || lower.includes('huesped') || lower.includes('paciente') || lower.includes('estudiante')) {
    return 'Usuario Final / Cliente';
  }
  if (lower.includes('mesero') || lower.includes('empleado') || lower.includes('doctor') || lower.includes('profesor')) {
    return 'Personal Operativo';
  }
  if (lower.includes('pedido') || lower.includes('venta') || lower.includes('factura') || lower.includes('pago')) {
    return 'Cajero / Gestor de Ventas';
  }
  return 'Usuario del Sistema';
}

export function generateUserStories(model: UmlModel): UserStory[] {
  const classes = model.classes ?? [];
  const relations = model.relations ?? [];

  return classes.map((cls, index) => {
    const num = String(index + 1).padStart(2, '0');
    const role = inferRoleForClass(cls.name);
    const lower = cls.name.toLowerCase();

    // Identify relations involving this class
    const relatedLinks = relations.filter(
      (r) => r.sourceClassId === cls.id || r.targetClassId === cls.id,
    );

    const relatedClassNames = relatedLinks.map((r) => {
      const otherId = r.sourceClassId === cls.id ? r.targetClassId : r.sourceClassId;
      return classes.find((c) => c.id === otherId)?.name ?? 'Entidad Relacionada';
    });

    const attrNames = (cls.attributes ?? []).map((a) => a.name).join(', ') || 'identificador y campos';

    const scenarios: GherkinScenario[] = [
      {
        title: `Registro exitoso de ${cls.name}`,
        given: `que el ${role.toLowerCase()} ingresa datos válidos para los campos (${attrNames})`,
        when: `confirma la creación de un nuevo ${lower} en el sistema`,
        then: `el sistema registra la entidad, asigna un ID único y retorna código HTTP 201 Created`,
      },
      {
        title: `Validación de datos obligatorios en ${cls.name}`,
        given: `que se omiten campos mandatorios o se envían tipos incompatibles`,
        when: `se intenta enviar la solicitud de registro o actualización`,
        then: `el sistema rechaza la operación con código HTTP 400 Bad Request y detalla los errores de validación`,
      },
      {
        title: `Consulta y recuperación de ${cls.name} por identificador`,
        given: `que existe un ${lower} persistido previamente en la base de datos con su ID`,
        when: `el usuario solicita la consulta mediante GET /api/${lower}s/{id}`,
        then: `el sistema devuelve la información completa con código HTTP 200 OK`,
      },
    ];

    if (relatedClassNames.length > 0) {
      scenarios.push({
        title: `Integridad referencial con ${relatedClassNames[0]}`,
        given: `que ${cls.name} se encuentra asociado con ${relatedClassNames[0]}`,
        when: `se realiza una operación de negocio vinculando ambas entidades`,
        then: `el sistema asegura la existencia de la clave foránea y mantiene la consistencia relacional`,
      });
    }

    const priority: 'Alta' | 'Media' | 'Baja' =
      index === 0 || cls.name.toLowerCase().includes('pedido') || cls.name.toLowerCase().includes('usuario')
        ? 'Alta'
        : index < 3
        ? 'Media'
        : 'Baja';

    const storyPoints = (cls.attributes?.length ?? 0) > 4 || relatedLinks.length > 1 ? 5 : 3;

    return {
      id: cls.id,
      code: `HU-${num}`,
      className: cls.name,
      title: `Gestión y Persistencia de ${cls.name}`,
      role,
      want: `registrar, consultar, modificar y listar ${cls.name} con sus atributos correspondientes`,
      soThat: `el sistema mantenga la trazabilidad, persistencia e integridad de los datos de ${cls.name}`,
      priority,
      storyPoints,
      scenarios,
    };
  });
}

export function exportUserStoriesMarkdown(stories: UserStory[], diagramName: string): string {
  const lines: string[] = [
    `# Especificación de Historias de Usuario (Scrum) y Criterios de Aceptación (Gherkin)`,
    `**Proyecto / Diagrama:** ${diagramName}`,
    `**Fecha de Generación:** ${new Date().toLocaleDateString('es-ES')}`,
    `**Metodología:** Ágil / Scrum con BDD (Behavior-Driven Development)`,
    ``,
    `---`,
    ``,
  ];

  for (const story of stories) {
    lines.push(`## ${story.code}: ${story.title}`);
    lines.push(`* **Entidad Relacionada:** \`${story.className}\``);
    lines.push(`* **Prioridad:** ${story.priority} | **Story Points:** ${story.storyPoints} pts`);
    lines.push(``);
    lines.push(`### Narrativa de Usuario`);
    lines.push(`> **Como** ${story.role},`);
    lines.push(`> **Quiero** ${story.want},`);
    lines.push(`> **Para** ${story.soThat}.`);
    lines.push(``);
    lines.push(`### Criterios de Aceptación (Formato Gherkin)`);
    for (const sc of story.scenarios) {
      lines.push(`#### Escenario: ${sc.title}`);
      lines.push(`\`\`\`gherkin`);
      lines.push(`  Dado ${sc.given}`);
      lines.push(`  Cuando ${sc.when}`);
      lines.push(`  Entonces ${sc.then}`);
      lines.push(`\`\`\``);
      lines.push(``);
    }
    lines.push(`---`);
    lines.push(``);
  }

  return lines.join('\n');
}
