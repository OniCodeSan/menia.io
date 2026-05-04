import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Plus, GripVertical, FileText, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LessonSidebar({ lessons, activeLessonId, onSelect, onAdd, onReorder }) {
  function onDragEnd(result) {
    if (!result.destination) return;
    if (result.source.index === result.destination.index) return;
    const items = Array.from(lessons);
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);
    onReorder(items);
  }

  return (
    <aside className="w-64 bg-card border-r border-border/30 flex flex-col">
      <div className="p-3 border-b border-border/30">
        <Button size="sm" className="w-full" onClick={onAdd}>
          <Plus className="w-3.5 h-3.5 mr-1" /> Nuova lezione
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {lessons.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-3">
            Nessuna lezione. Aggiungi la prima e marcala come <strong>preview</strong> per attirare studenti.
          </p>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="lessons">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps} className="space-y-1">
                  {lessons.map((l, i) => (
                    <Draggable key={l.id} draggableId={String(l.id)} index={i}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          className={`group flex items-center gap-1 rounded-lg text-sm transition-colors ${
                            activeLessonId === l.id
                              ? "bg-primary/15 text-primary"
                              : "hover:bg-secondary/40"
                          } ${snap.isDragging ? "opacity-70" : ""}`}
                        >
                          <span {...prov.dragHandleProps} className="cursor-grab px-1 opacity-40 group-hover:opacity-100">
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                          <button
                            onClick={() => onSelect(l.id)}
                            title={l.title || "Senza titolo"}
                            className="flex-1 text-left py-2 pr-2 truncate flex items-center gap-1.5 min-w-0"
                          >
                            <FileText className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{l.title || "Senza titolo"}</span>
                            {l.is_preview && <Eye className="w-3 h-3 text-chart-3 flex-shrink-0" title="Anteprima" />}
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        )}
      </div>
    </aside>
  );
}
