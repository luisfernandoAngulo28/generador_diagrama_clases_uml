import { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search,
  X,
  Terminal,
  Server,
  ShieldCheck,
  Gauge,
  GitCommitHorizontal,
  BookOpenCheck,
  GitCompare,
  Code2,
  Workflow,
  Plus,
  StickyNote,
  Save,
  ImageIcon,
  Database,
  Send,
  Download,
  Box,
  CornerDownLeft,
  User,
  LogOut,
} from 'lucide-react';
import type { Node } from '@xyflow/react';
import type { UmlClassNodeData } from './UmlClassNode';

export interface CommandItem {
  id: string;
  category: 'Comando' | 'Clase';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  keywords: string[];
  action: () => void;
}

interface CommandPaletteModalProps {
  nodes: Node<UmlClassNodeData>[];
  onClose: () => void;
  onFocusClass: (nodeId: string) => void;
  onAddClass: () => void;
  onAddNote: () => void;
  onSaveDiagram: () => void;
  onValidate: () => void;
  onOpenMetrics: () => void;
  onOpenSequence: () => void;
  onOpenStories: () => void;
  onOpenDiff: () => void;
  onOpenRunnerApi: () => void;
  onPreviewJava: () => void;
  onGenerateBackend: () => void;
  onAutoLayout: () => void;
  onExportPng: () => void;
  onExportSql: () => void;
  onExportPostman: () => void;
  onExportXmi: () => void;
  onOpenProfile?: () => void;
  onLogout?: () => void;
}

export function CommandPaletteModal({
  nodes,
  onClose,
  onFocusClass,
  onAddClass,
  onAddNote,
  onSaveDiagram,
  onValidate,
  onOpenMetrics,
  onOpenSequence,
  onOpenStories,
  onOpenDiff,
  onOpenRunnerApi,
  onPreviewJava,
  onGenerateBackend,
  onAutoLayout,
  onExportPng,
  onExportSql,
  onExportPostman,
  onExportXmi,
  onOpenProfile,
  onLogout,
}: CommandPaletteModalProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const commandsList = useMemo<CommandItem[]>(() => {
    const list: CommandItem[] = [
      {
        id: 'cmd-runner-api',
        category: 'Comando',
        title: 'Simular API REST (Runner en el Navegador)',
        subtitle: 'Probar endpoints GET, POST, PUT, DELETE con DB en memoria',
        icon: <Terminal size={17} className="command-palette__icon--green" />,
        keywords: ['api', 'runner', 'mock', 'rest', 'endpoint', 'probar', 'test', 'http', 'postman'],
        action: () => {
          onClose();
          onOpenRunnerApi();
        },
      },
      {
        id: 'cmd-backend',
        category: 'Comando',
        title: 'Generar Backend Spring Boot (ZIP)',
        subtitle: 'Descarga el código Java 4 capas, Maven y JPA listo',
        icon: <Server size={17} className="command-palette__icon--purple" />,
        keywords: ['backend', 'spring', 'boot', 'java', 'generar', 'zip', 'codigo', 'descargar'],
        action: () => {
          onClose();
          onGenerateBackend();
        },
      },
      {
        id: 'cmd-validate',
        category: 'Comando',
        title: 'Validar Diagrama y Reglas de Diseño UML',
        subtitle: 'Verificar ciclos de herencia, claves primarias y relaciones',
        icon: <ShieldCheck size={17} className="command-palette__icon--blue" />,
        keywords: ['validar', 'reglas', 'errores', 'verificar', 'check', 'uml'],
        action: () => {
          onClose();
          onValidate();
        },
      },
      {
        id: 'cmd-metrics',
        category: 'Comando',
        title: 'Panel de Métricas OO (Chidamber & Kemerer / SOLID)',
        subtitle: 'Calcular CBO, DIT, NOC, God Class y puntuación de diseño',
        icon: <Gauge size={17} className="command-palette__icon--amber" />,
        keywords: ['metricas', 'cbo', 'dit', 'noc', 'calidad', 'solid', 'god class', 'oo'],
        action: () => {
          onClose();
          onOpenMetrics();
        },
      },
      {
        id: 'cmd-sequence',
        category: 'Comando',
        title: 'Generar Diagrama de Secuencia UML',
        subtitle: 'Flujo de capas Spring Boot en PlantUML y Mermaid.js',
        icon: <GitCommitHorizontal size={17} className="command-palette__icon--sky" />,
        keywords: ['secuencia', 'dinamico', 'plantuml', 'mermaid', 'flujo', 'capas'],
        action: () => {
          onClose();
          onOpenSequence();
        },
      },
      {
        id: 'cmd-stories',
        category: 'Comando',
        title: 'Generar Historias de Usuario Scrum y Gherkin (BDD)',
        subtitle: 'Criterios Dado-Cuando-Entonces y backlog ágil descargable',
        icon: <BookOpenCheck size={17} className="command-palette__icon--rose" />,
        keywords: ['historias', 'scrum', 'gherkin', 'bdd', 'user stories', 'backlog'],
        action: () => {
          onClose();
          onOpenStories();
        },
      },
      {
        id: 'cmd-diff',
        category: 'Comando',
        title: 'Comparador Visual de Versiones (Diagram Diff)',
        subtitle: 'Ver diferencias visuales (+ agregadas, ~ modificadas, - eliminadas)',
        icon: <GitCompare size={17} className="command-palette__icon--emerald" />,
        keywords: ['diff', 'comparar', 'versiones', 'cambios', 'historial'],
        action: () => {
          onClose();
          onOpenDiff();
        },
      },
      {
        id: 'cmd-preview-java',
        category: 'Comando',
        title: 'Previsualizar Código Java Spring Boot',
        subtitle: 'Inspeccionar código generado en vivo para entidades y repositorios',
        icon: <Code2 size={17} className="command-palette__icon--purple" />,
        keywords: ['java', 'codigo', 'preview', 'ver', 'fuente', 'entity'],
        action: () => {
          onClose();
          onPreviewJava();
        },
      },
      {
        id: 'cmd-layout',
        category: 'Comando',
        title: 'Reorganizar Lienzo Automáticamente (Auto-Layout)',
        subtitle: 'Alinear y distribuir nodos automáticamente con Dagre',
        icon: <Workflow size={17} />,
        keywords: ['layout', 'organizar', 'alinear', 'ordenar', 'reorganizar'],
        action: () => {
          onClose();
          onAutoLayout();
        },
      },
      {
        id: 'cmd-add-class',
        category: 'Comando',
        title: 'Crear Nueva Clase UML',
        subtitle: 'Añadir nueva entidad al lienzo de trabajo',
        icon: <Plus size={17} className="command-palette__icon--green" />,
        keywords: ['crear', 'nueva', 'clase', 'entidad', 'add', 'class'],
        action: () => {
          onClose();
          onAddClass();
        },
      },
      {
        id: 'cmd-add-note',
        category: 'Comando',
        title: 'Crear Nota Adhesiva',
        subtitle: 'Añadir nota explicativa en el diagrama',
        icon: <StickyNote size={17} className="command-palette__icon--amber" />,
        keywords: ['nota', 'adhesiva', 'comentario', 'sticky'],
        action: () => {
          onClose();
          onAddNote();
        },
      },
      {
        id: 'cmd-save',
        category: 'Comando',
        title: 'Guardar Diagrama',
        subtitle: 'Guardar cambios actuales en la base de datos',
        icon: <Save size={17} />,
        keywords: ['guardar', 'save', 'persistir', 'actualizar'],
        action: () => {
          onClose();
          onSaveDiagram();
        },
      },
      {
        id: 'cmd-export-png',
        category: 'Comando',
        title: 'Exportar Imagen (PNG)',
        subtitle: 'Descargar imagen rasterizada de alta resolución',
        icon: <ImageIcon size={17} />,
        keywords: ['exportar', 'png', 'imagen', 'foto', 'descargar'],
        action: () => {
          onClose();
          onExportPng();
        },
      },
      {
        id: 'cmd-export-sql',
        category: 'Comando',
        title: 'Exportar Script SQL DDL',
        subtitle: 'Descargar script SQL con CREATE TABLE y restricciones foráneas',
        icon: <Database size={17} />,
        keywords: ['sql', 'ddl', 'schema', 'base de datos', 'postgres', 'tablas'],
        action: () => {
          onClose();
          onExportSql();
        },
      },
      {
        id: 'cmd-export-postman',
        category: 'Comando',
        title: 'Exportar Colección Postman v2.1',
        subtitle: 'Descargar archivo JSON con endpoints CRUD listos para importar',
        icon: <Send size={17} />,
        keywords: ['postman', 'coleccion', 'json', 'endpoints'],
        action: () => {
          onClose();
          onExportPostman();
        },
      },
      {
        id: 'cmd-export-xmi',
        category: 'Comando',
        title: 'Exportar Archivo XMI (UML Estándar)',
        subtitle: 'Compatible con Enterprise Architect y herramientas CASE',
        icon: <Download size={17} />,
        keywords: ['xmi', 'exportar', 'enterprise architect', 'estandar'],
        action: () => {
          onClose();
          onExportXmi();
        },
      },
      ...(onOpenProfile
        ? [
            {
              id: 'cmd-profile',
              category: 'Comando' as const,
              title: 'Mi Perfil (Editar Datos Personales)',
              subtitle: 'Modificar nombre, correo o cambiar contraseña',
              icon: <User size={17} className="command-palette__icon--blue" />,
              keywords: ['perfil', 'usuario', 'cuenta', 'nombre', 'correo', 'password', 'clave'],
              action: () => {
                onClose();
                onOpenProfile();
              },
            },
          ]
        : []),
      ...(onLogout
        ? [
            {
              id: 'cmd-logout',
              category: 'Comando' as const,
              title: 'Cerrar Sesión',
              subtitle: 'Salir de la cuenta actual de forma segura',
              icon: <LogOut size={17} className="command-palette__icon--red" />,
              keywords: ['salir', 'logout', 'cerrar', 'sesion'],
              action: () => {
                onClose();
                onLogout();
              },
            },
          ]
        : []),
    ];

    // Add classes as searchable items
    for (const node of nodes) {
      if (node.data?.umlClass) {
        const cls = node.data.umlClass;
        list.push({
          id: `class-${cls.id}`,
          category: 'Clase',
          title: cls.name,
          subtitle: `Clase con ${cls.attributes.length} atributos${cls.stereotype ? ` [${cls.stereotype}]` : ''}`,
          icon: <Box size={17} className="command-palette__icon--class" />,
          keywords: [
            cls.name.toLowerCase(),
            cls.stereotype?.toLowerCase() ?? '',
            ...cls.attributes.map((a) => a.name.toLowerCase()),
          ],
          action: () => {
            onClose();
            onFocusClass(node.id);
          },
        });
      }
    }

    return list;
  }, [
    nodes,
    onClose,
    onOpenRunnerApi,
    onGenerateBackend,
    onValidate,
    onOpenMetrics,
    onOpenSequence,
    onOpenStories,
    onOpenDiff,
    onPreviewJava,
    onAutoLayout,
    onAddClass,
    onAddNote,
    onSaveDiagram,
    onExportPng,
    onExportSql,
    onExportPostman,
    onExportXmi,
    onFocusClass,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commandsList;

    return commandsList.filter((item) => {
      if (item.title.toLowerCase().includes(q)) return true;
      if (item.subtitle?.toLowerCase().includes(q)) return true;
      return item.keywords.some((k) => k.includes(q));
    });
  }, [commandsList, query]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev <= 0 ? Math.max(0, filtered.length - 1) : prev - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    }
  }

  return (
    <div className="command-palette-backdrop" onClick={onClose}>
      <div
        className="command-palette-modal"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <div className="command-palette__search-bar">
          <Search size={18} className="command-palette__search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="command-palette__input"
            placeholder="Escribe un comando o busca una clase (ej. 'api', 'scrum', 'java', 'orden')…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <kbd className="command-palette__esc-kbd">ESC</kbd>
          <button className="command-palette__close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="command-palette__results">
          {filtered.length === 0 ? (
            <div className="command-palette__empty">
              No se encontraron comandos o clases coincidentes con "{query}".
            </div>
          ) : (
            filtered.map((item, i) => {
              const isSelected = i === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`command-palette__item ${
                    isSelected ? 'command-palette__item--selected' : ''
                  }`}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <div className="command-palette__item-icon">{item.icon}</div>
                  <div className="command-palette__item-info">
                    <div className="command-palette__item-title-row">
                      <span className="command-palette__item-title">{item.title}</span>
                      <span className="command-palette__category-badge">{item.category}</span>
                    </div>
                    {item.subtitle && (
                      <span className="command-palette__item-subtitle">{item.subtitle}</span>
                    )}
                  </div>
                  {isSelected && (
                    <div className="command-palette__enter-indicator">
                      <CornerDownLeft size={13} />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="command-palette__footer">
          <span><kbd className="command-palette__kbd">↑</kbd> <kbd className="command-palette__kbd">↓</kbd> Navegar</span>
          <span><kbd className="command-palette__kbd">Enter</kbd> Ejecutar</span>
          <span><kbd className="command-palette__kbd">Esc</kbd> Cerrar</span>
        </div>
      </div>
    </div>
  );
}
