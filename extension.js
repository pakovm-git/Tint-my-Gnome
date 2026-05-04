import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import { Extension } from 'resource:///org/gnome/shell/extensions/extension.js';

Gio._promisify(Gio.File.prototype, 'load_contents_async');
Gio._promisify(Gio.File.prototype, 'replace_contents_bytes_async', 'replace_contents_finish');

export default class TintMyGnomeExtension extends Extension {
  gtk4ConfigDirectory = Gio.File.new_for_path(GLib.build_filenamev([GLib.get_user_config_dir(), 'gtk-4.0']));
  userGtk4StylesheetFile = this.gtk4ConfigDirectory.get_child('gtk.css');
  tintMyGnomeGtk4Stylesheet = this.dir.get_child('gtk-4.0').get_child('gtk.css');

  async enable() {
    try {
      this.setupGtkFolders()

      const oldUserGtk4Stylesheet = await this.readFileContents(this.userGtk4StylesheetFile).catch(this.throwWithMessage("Could not get gtk-4.0/gtk.css contents."))
      const newUserGtk4Stylesheet = this.addImportToContentsForPath(oldUserGtk4Stylesheet, this.tintMyGnomeGtk4Stylesheet.get_path())
      await this.replaceFileContents(this.userGtk4StylesheetFile,newUserGtk4Stylesheet).catch(this.throwWithMessage("Could not update gtk-4.0/gtk.css contents."))
    }
    catch (e) {
      console.error(e)
    }
  }

  throwWithMessage(m) {
    return (e)=>{
      const msg = `[tint-my-gnome@pakovm] "${m}" : ${e}`
      throw new Error(msg)
    }
  }


  async disable() {
    try {
      const oldUserGtk4Stylesheet = await this.readFileContents(this.userGtk4StylesheetFile).catch(this.throwWithMessage("Could not get gtk-4.0/gtk.css contents."))
      const newUserGtk4Stylesheet = this.removeTintMyGnomeImportFromContents(oldUserGtk4Stylesheet, this.tintMyGnomeGtk4Stylesheet.get_path())
      await this.replaceFileContents(this.userGtk4StylesheetFile,newUserGtk4Stylesheet).catch(this.throwWithMessage("Could not update gtk-4.0/gtk.css contents."))
    }
    catch (e) {
      console.error(e)
    }
  }

  setupGtkFolders() {
    if (!this.gtk4ConfigDirectory.query_exists(null)) {
        this.gtk4ConfigDirectory.make_directory_with_parents(null);
    }
  }

  async readFileContents(file) {
    let string = ''
    if (file.query_exists(null)) {
      const [contents] = await file.load_contents_async(null).catch(this.throwWithMessage(`Could not open file for reading ${file.get_path()}`))
      string = new TextDecoder().decode(contents);
    }
    return string
  }

  async replaceFileContents(file,contents) {
    try {
      await file.replace_contents_bytes_async(new GLib.Bytes(contents), null, false, Gio.FileCreateFlags.REPLACE_DESTINATION, null)

    } catch (e) {
      this.throwWithMessage(`Failed to replace contents of file '${file.get_path()}'.`)(e)
    }
  }

  addImportToContentsForPath(contents, path) {
    const contentsWithoutImport = this.removeTintMyGnomeImportFromContents(contents)
    const importString = `@import '${path}';\n`;
    return importString + contentsWithoutImport
  }

  removeTintMyGnomeImportFromContents(contents) {
    return contents.split('\n').filter(e=>!e.includes('tint-my-gnome@pakovm')).join('\n')
  }
}
