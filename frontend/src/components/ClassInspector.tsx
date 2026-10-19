import { Code2, Copy, GitCommitHorizontal, Terminal, Trash2, UserRound, X } from 'lucide-react';
import type { AuthorStamp, AuthorshipIndex, ClassStereotype, UmlClass } from '../types/uml';

const STEREOTYPE_OPTIONS: { value: ClassStereotype | ''; label: string; hint: string }[] = [
  { value: '', label: 'Ninguno', hint: '' },
  { value: 'enum', label: '«enum»', hint: 'genera un enum de Java en vez de una entidad' },
  { value: 'abstract', label: '«abstract»', hint: 'genera una clase abstracta (usar con Herencia)' },
  { value: 'interface', label: '«interface»', hint: 'genera una interfaz de Java a partir de las operaciones' },
];

interface ClassInspectorProps {
  umlClass: UmlClass;
  onChange: (updated: UmlClass) => void;
  onClose: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onPreviewCode?: () => void;
  onOpenSequence?: () => void;
  onOpenMockApi?: () => void;
  /** Who created / last edited this class and its attributes (from the server). */
  authorship?: AuthorshipIndex[string];
}

/**
 * "Properties" panel: general identity of the selected class (name,
 * stereotype, notes). Attributes/Operations live in the bottom-docked
 * FeaturesPanel instead, mirroring Enterprise Architect's Properties +
 * Features split.
 */
export function ClassInspector({
  umlClass,
  onChange,
  onClose,
  onDelete,
  onDuplicate,
  onPreviewCode,
  onOpenSequence,
  onOpenMockApi,
  authorship,
}: ClassInspectorProps) {
  const currentStereotype = STEREOTYPE_OPTIONS.find((o) => o.value === (umlClass.stereotype ?? ''));

  return (
    <aside className="inspector">
      <div className="inspector__header">
        <input
          className="inspector__class-name"
          value={umlClass.name}
          onChange={(e) => onChange({ ...umlClass, name: e.target.value })}
          placeholder="Nombre de la clase"
        />
        <button className="inspector__close" onClick={onClose} title="Cerrar inspector">
          <X size={16} />
        </button>
      </div>

      <AuthorshipSection umlClass={umlClass} authorship={authorship} />

      <label className="inspector__field">
        Estereotipo
        <select
          className="inspector__cell-input"
          value={umlClass.stereotype ?? ''}
          onChange={(e) =>
            onChange({
              ...umlClass,
              stereotype: (e.target.value || undefined) as ClassStereotype | undefined,
            })
          }
        >
          {STEREOTYPE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {currentStereotype?.hint && (
          <span className="inspector__field-hint">{currentStereotype.hint}</span>
        )}
      </label>

      <label className="inspector__field">
        Notas
        <textarea
          className="inspector__notes"
          rows={6}
          placeholder="Describe el propósito de esta clase (aparece en la documentación generada)…"
          value={umlClass.description ?? ''}
          onChange={(e) => onChange({ ...umlClass, description: e.target.value })}
        />
      </label>

      <div className="inspector__actions">
        {onPreviewCode && (
          <button
            className="inspector__preview"
            onClick={onPreviewCode}
            title="Ver el código Java generado para esta clase"
          >
            <Code2 size={13} /> Ver Java
          </button>
        )}
        {onOpenSequence && (
          <button
            className="inspector__preview"
            onClick={onOpenSequence}
            title="Generar y ver el diagrama de secuencia UML dinámico para esta clase"
          >
            <GitCommitHorizontal size={13} /> Secuencia
          </button>
        )}
        {onOpenMockApi && umlClass.stereotype !== 'interface' && umlClass.stereotype !== 'enum' && (
          <button
            className="inspector__preview"
            onClick={onOpenMockApi}
            title="Simular y probar endpoints REST de esta entidad en el navegador"
          >
            <Terminal size={13} /> Simular API
          </button>
        )}
        <button className="inspector__duplicate" onClick={onDuplicate} title="Clonar esta clase con todos sus atributos">
          <Copy size={13} /> Duplicar
        </button>
        <button className="inspector__delete" onClick={onDelete} title="Eliminar clase">
          <Trash2 size={13} /> Eliminar
        </button>
      </div>
    </aside>
  );
}

const SOURCE_LABEL: Record<NonNullable<AuthorStamp['source']>, string> = {
  MANUAL: '',
  AI: 'vía IA',
  XMI_IMPORT: 'importado de XMI',
  PHOTO: 'desde foto',
};

function formatStamp(stamp: AuthorStamp): string {
  return new Date(stamp.timestamp).toLocaleString('es-BO', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Who({ stamp }: { stamp: AuthorStamp }) {
  const source = stamp.source ? SOURCE_LABEL[stamp.source] : '';
  return (
    <span>
      <strong>{stamp.userName}</strong>
      {source && <span className="inspector__authorship-ai"> · {source}</span>} · {formatStamp(stamp)}
    </span>
  );
}

/**
 * Granular authorship (2do Parcial): who created the class, who edited it
 * last, and who added each attribute. Comes from the server, updated live
 * through the `diagram:authorship` socket event after every save.
 */
function AuthorshipSection({
  umlClass,
  authorship,
}: {
  umlClass: UmlClass;
  authorship?: AuthorshipIndex[string];
}) {
  const author = authorship?.author;
  const editor = authorship?.lastModifiedBy;
  const attrAuthors = umlClass.attributes
    .map((a) => ({ name: a.name, stamp: authorship?.attributes[a.name]?.author }))
    .filter((a) => a.stamp && a.stamp.userId !== author?.userId);

  return (
    <section className="inspector__authorship" aria-label="Autoría">
      <div className="inspector__authorship-title">
        <UserRound size={13} /> Autoría
      </div>
      {author ? (
        <>
          <div className="inspector__authorship-row">
            <span>Creada por</span>
            <Who stamp={author} />
          </div>
          {editor && (
            <div className="inspector__authorship-row">
              <span>Última edición</span>
              <Who stamp={editor} />
            </div>
          )}
          {attrAuthors.length > 0 && (
            <ul className="inspector__authorship-attrs">
              {attrAuthors.map((a) => (
                <li key={a.name}>
                  {a.name}: agregado por {a.stamp!.userName}
                  {a.stamp!.source === 'AI' ? ' (vía IA)' : ''}
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <span className="inspector__authorship-empty">
          Sin registro todavía: se asigna al guardar (o la clase viene del 1er Parcial).
        </span>
      )}
    </section>
  );
}
