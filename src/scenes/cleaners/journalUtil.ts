/**
 * THE CLEANERS — open the Journal overlay from any room.
 *
 * Centralises the "press J in a room" flow so every scene does it the
 * same way: pause the room, launch the journal with the room's key as
 * init data, and on close the journal can resume exactly that room.
 *
 * Without this, the journal had no way of knowing which room paused it
 * (active-scene queries return Hud / Journal, NOT the paused room) and
 * was resuming the wrong scene. Now it's one call per room.
 */
import Phaser from "phaser";

export function openJournal(fromScene: Phaser.Scene): void {
  if (fromScene.scene.manager.isActive("Journal")) return;
  fromScene.scene.launch("Journal", { from: fromScene.scene.key });
  fromScene.scene.pause();
}
