import { useState, useSyncExternalStore } from "react";
import * as projects from "../session/projects";

// Save sheet → Projects: save the whole set as a named project, and reopen,
// rename or delete saved ones. Stored in this browser (no model files inside).
const fmtDate = (ms) => new Date(ms).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export default function ProjectsPanel({ session }) {
  const s = useSyncExternalStore(projects.subscribe, projects.getSnapshot, projects.getSnapshot);
  const [notice, setNotice] = useState("");
  const [confirmId, setConfirmId] = useState(null);
  const [renaming, setRenaming] = useState(null); // { id, name }
  const current = s.projects.find((p) => p.id === s.currentId);

  const save = (asNew) => {
    const r = projects.saveProject(session.projectName, { asNew });
    setNotice(r.message);
  };
  const open = (p) => {
    const name = projects.openProject(p.id);
    if (name) {
      session.onProjectNameChange?.(name);
      setNotice(`Opened "${name}". Props and models may take a moment to load.`);
    } else setNotice("That project could not be opened.");
  };

  return (
    <div className="sos2-projects">
      <span className="sos2-sheet-subhead">Projects</span>
      <p className="sos2-note">
        {current ? (
          <>
            Working on <strong>{current.name}</strong>
          </>
        ) : (
          "Save the whole set (props, Reel, camera paths, look, effects) as a named project."
        )}
      </p>
      <div className="sos2-btn-row">
        <button type="button" className="sos2-btn sos2-btn-primary" data-testid="ui-project-save" onClick={() => save(false)} title={current ? `Save changes to "${current.name}"` : "Save as a new project"}>
          {current ? "Save project" : "Save as project"}
        </button>
        {current ? (
          <button type="button" className="sos2-btn" data-testid="ui-project-save-new" onClick={() => save(true)} title="Save a copy as a new project">
            Save as new
          </button>
        ) : null}
      </div>
      {notice ? (
        <p className="sos2-note" role="status">
          {notice}
        </p>
      ) : null}

      {s.projects.length === 0 ? (
        <p className="sos2-note">No projects yet. Name your set above, then click Save as project.</p>
      ) : (
        <ul className="sos2-project-list">
          {s.projects.map((p) => (
            <li key={p.id} data-current={p.id === s.currentId || undefined}>
              {p.thumb ? <img src={p.thumb} alt="" /> : <span className="sos2-project-nothumb" aria-hidden="true" />}
              <div className="sos2-project-info">
                {renaming && renaming.id === p.id ? (
                  <input
                    className="sos2-input"
                    id={`project-rename-${p.id}`}
                    aria-label="Project name"
                    value={renaming.name}
                    maxLength={60}
                    autoFocus
                    onChange={(e) => setRenaming({ id: p.id, name: e.target.value })}
                    onBlur={() => {
                      projects.renameProject(p.id, renaming.name);
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") e.currentTarget.blur();
                      if (e.key === "Escape") setRenaming(null);
                    }}
                  />
                ) : (
                  <strong>{p.name}</strong>
                )}
                <span>{fmtDate(p.savedAt)}</span>
                <div className="sos2-project-actions">
                  <button type="button" className="sos2-btn" onClick={() => open(p)}>
                    Open
                  </button>
                  <button type="button" className="sos2-btn" onClick={() => setRenaming({ id: p.id, name: p.name })}>
                    Rename
                  </button>
                  {confirmId === p.id ? (
                    <>
                      <button
                        type="button"
                        className="sos2-btn sos2-btn-danger"
                        onClick={() => {
                          projects.deleteProject(p.id);
                          setConfirmId(null);
                          setNotice(`Deleted "${p.name}".`);
                        }}
                      >
                        Delete for good
                      </button>
                      <button type="button" className="sos2-btn" onClick={() => setConfirmId(null)}>
                        Keep
                      </button>
                    </>
                  ) : (
                    <button type="button" className="sos2-btn" onClick={() => setConfirmId(p.id)}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
