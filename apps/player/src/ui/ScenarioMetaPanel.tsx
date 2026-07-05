import { usePlayerStore } from '../store';

type Primitive = string | number | boolean;

type ScenarioMeta = {
  title?: string;
  description?: string;
  scenarioVersion?: string;
  designer?: {
    name?: string;
    handle?: string;
    contact?: {
      email?: string;
      url?: string;
    };
    links?: Array<{
      label?: string;
      url?: string;
      rel?: string;
    }>;
  };
  license?: string;
  createdAt?: string;
  updatedAt?: string;
  pins?: Record<string, string>;
  contentSources?: Array<Record<string, unknown>>;
  provenance?: {
    importedSeed?: {
      seed?: string;
      decodedSetup?: Record<string, unknown>;
    };
  };
  tags?: string[];
};

function formatDate(value?: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString();
}

function renderPrimitive(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return 'Unknown';
}

function objectRows(data: Record<string, unknown> | undefined): Array<[string, Primitive]> {
  if (!data) return [];
  const rows: Array<[string, Primitive]> = [];
  for (const [key, value] of Object.entries(data)) {
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      rows.push([key, value]);
    }
  }
  return rows;
}

export function ScenarioMetaPanel() {
  const scenario = usePlayerStore((s) => s.scenario) as { meta?: ScenarioMeta } | null;
  const meta = scenario?.meta;

  return (
    <section style={panelStyle}>
      <h3 style={headStyle}>Scenario Info</h3>

      {!meta && (
        <div style={emptyStyle}>Load a scenario to view metadata.</div>
      )}

      {meta && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {meta.title && <Field label="Title" value={meta.title} />}
          {meta.description && <Field label="Description" value={meta.description} />}
          {meta.scenarioVersion && <Field label="Scenario Version" value={meta.scenarioVersion} />}
          {meta.license && <Field label="License" value={meta.license} />}

          {(meta.createdAt || meta.updatedAt) && (
            <Section title="Dates">
              {meta.createdAt && <Field label="Created" value={formatDate(meta.createdAt) ?? meta.createdAt} />}
              {meta.updatedAt && <Field label="Updated" value={formatDate(meta.updatedAt) ?? meta.updatedAt} />}
            </Section>
          )}

          {meta.designer && (
            <Section title="Designer">
              {meta.designer.name && <Field label="Name" value={meta.designer.name} />}
              {meta.designer.handle && <Field label="Handle" value={meta.designer.handle} />}
              {meta.designer.contact?.email && <Field label="Email" value={meta.designer.contact.email} />}
              {meta.designer.contact?.url && (
                <Field
                  label="Website"
                  value={
                    <a href={meta.designer.contact.url} target="_blank" rel="noreferrer" style={linkStyle}>
                      {meta.designer.contact.url}
                    </a>
                  }
                />
              )}
              {meta.designer.links && meta.designer.links.length > 0 && (
                <div>
                  <div style={subheadStyle}>Links</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {meta.designer.links.map((link, index) => (
                      <div key={`${link.url ?? 'link'}-${index}`} style={listRowStyle}>
                        <span style={keyStyle}>{link.label ?? link.rel ?? `Link ${index + 1}`}</span>
                        {link.url ? (
                          <a href={link.url} target="_blank" rel="noreferrer" style={linkStyle}>
                            {link.url}
                          </a>
                        ) : (
                          <span style={valueStyle}>Unknown</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Section>
          )}

          {meta.contentSources && meta.contentSources.length > 0 && (
            <Section title="Content Sources">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {meta.contentSources.map((src, index) => {
                  const rows = objectRows(src);
                  return (
                    <div key={`source-${index}`} style={itemCardStyle}>
                      <div style={subheadStyle}>Source {index + 1}</div>
                      {rows.length > 0 ? (
                        rows.map(([key, value]) => (
                          <Field key={key} label={key} value={String(value)} compact />
                        ))
                      ) : (
                        <div style={emptyInlineStyle}>No primitive fields</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Section>
          )}

          {meta.provenance?.importedSeed && (
            <Section title="Seed">
              {meta.provenance.importedSeed.seed && (
                <Field label="Imported Seed" value={meta.provenance.importedSeed.seed} />
              )}
              {meta.provenance.importedSeed.decodedSetup && (
                <div>
                  <div style={subheadStyle}>Decoded Setup</div>
                  {objectRows(meta.provenance.importedSeed.decodedSetup).map(([key, value]) => (
                    <Field key={key} label={key} value={String(value)} compact />
                  ))}
                </div>
              )}
            </Section>
          )}

          {meta.tags && meta.tags.length > 0 && (
            <Section title="Tags">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {meta.tags.map((tag) => (
                  <span key={tag} style={tagStyle}>{tag}</span>
                ))}
              </div>
            </Section>
          )}

          <details style={sectionStyle}>
            <summary style={summaryStyle}>Scenario Json</summary>
            <pre style={rawMetaStyle}>{JSON.stringify(meta, null, 2)}</pre>
          </details>
        </div>
      )}
    </section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={sectionStyle}>
      <div style={subheadStyle}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>{children}</div>
    </div>
  );
}

function Field({
  label,
  value,
  compact = false,
}: {
  label: string;
  value: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div style={compact ? listRowStyleCompact : listRowStyle}>
      <span style={keyStyle}>{label}</span>
      <span style={valueStyle}>{typeof value === 'string' ? renderPrimitive(value) : value}</span>
    </div>
  );
}

const panelStyle: React.CSSProperties = {
  background:
    'linear-gradient(165deg, color-mix(in srgb, var(--c-primary) 14%, var(--c-surface-raised)) 0%, var(--c-surface-raised) 55%)',
  border: '1px solid color-mix(in srgb, var(--c-primary) 35%, var(--c-border))',
  borderRadius: 10,
  padding: 14,
  boxShadow: '0 10px 22px color-mix(in srgb, var(--c-primary) 15%, transparent)',
};

const headStyle: React.CSSProperties = {
  margin: '0 0 10px',
  fontSize: 12,
  fontWeight: 700,
  color: 'var(--c-text)',
  textTransform: 'uppercase',
  letterSpacing: 0.7,
};

const emptyStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--c-text-muted)',
  border: '1px dashed color-mix(in srgb, var(--c-primary) 35%, var(--c-border))',
  borderRadius: 8,
  padding: 10,
  background: 'color-mix(in srgb, var(--c-primary) 8%, var(--c-surface))',
};

const sectionStyle: React.CSSProperties = {
  border: '1px solid color-mix(in srgb, var(--c-primary) 18%, var(--c-border))',
  borderRadius: 8,
  padding: 9,
  background:
    'linear-gradient(180deg, color-mix(in srgb, var(--c-primary) 7%, var(--c-surface)) 0%, var(--c-surface) 100%)',
};

const subheadStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--c-primary)',
  marginBottom: 4,
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const listRowStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
  padding: '2px 0',
};

const listRowStyleCompact: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  gap: 8,
  padding: '2px 0',
  borderBottom: '1px dashed color-mix(in srgb, var(--c-primary) 14%, var(--c-border))',
};

const keyStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: 'var(--c-text-faint)',
};

const valueStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--c-text)',
  wordBreak: 'break-word',
};

const itemCardStyle: React.CSSProperties = {
  border: '1px solid color-mix(in srgb, var(--c-primary) 14%, var(--c-border))',
  borderRadius: 8,
  padding: 8,
  background: 'color-mix(in srgb, var(--c-primary) 5%, var(--c-surface-raised))',
};

const emptyInlineStyle: React.CSSProperties = {
  fontSize: 11,
  color: 'var(--c-text-faint)',
};

const tagStyle: React.CSSProperties = {
  fontSize: 10,
  padding: '3px 8px',
  borderRadius: 999,
  background: 'color-mix(in srgb, var(--c-primary) 16%, var(--c-surface))',
  border: '1px solid color-mix(in srgb, var(--c-primary) 35%, var(--c-border))',
  color: 'var(--c-text-2)',
  fontWeight: 600,
};

const linkStyle: React.CSSProperties = {
  color: 'color-mix(in srgb, var(--c-primary) 85%, var(--c-text))',
  textDecoration: 'none',
  wordBreak: 'break-word',
  fontWeight: 600,
};

const summaryStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--c-primary)',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  cursor: 'pointer',
};

const rawMetaStyle: React.CSSProperties = {
  margin: '8px 0 0',
  fontSize: 10,
  lineHeight: 1.35,
  color: 'var(--c-text-muted)',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};
