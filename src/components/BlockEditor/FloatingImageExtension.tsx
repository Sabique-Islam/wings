// Free-canvas was removed (use Excalidraw for that). Keep this module as a
// thin re-export so existing imports keep working with the standard Tiptap
// Image extension behavior — perfect markdown round-trips, inline flow.
import Image from "@tiptap/extension-image";

export const FloatingImage = Image;
