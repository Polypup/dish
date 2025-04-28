import fs from 'node:fs'
import path from 'node:path'

export default function copyStyles() {
  return {
    name: 'vite-plugin-copy-styles',
    generateBundle(outputOptions, bundle) {
      // Create the assets directory if it doesn't exist
      const assetsDir = path.join(process.cwd(), 'dist', 'assets')
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true })
      }

      // Copy Vuetify CSS
      const vuetifySourcePath = path.join(process.cwd(), 'node_modules', 'vuetify', 'lib', 'styles', 'main.css')
      const vuetifyDestPath = path.join(assetsDir, 'vuetify-main.css')
      if (fs.existsSync(vuetifySourcePath)) {
        fs.copyFileSync(vuetifySourcePath, vuetifyDestPath)
        this.emitFile({
          type: 'asset',
          fileName: 'assets/vuetify-main.css',
          source: fs.readFileSync(vuetifySourcePath)
        })
      }

      // Copy MDI Font CSS
      const mdiSourcePath = path.join(process.cwd(), 'node_modules', '@mdi', 'font', 'css', 'materialdesignicons.min.css')
      const mdiDestPath = path.join(assetsDir, 'materialdesignicons.min.css')
      if (fs.existsSync(mdiSourcePath)) {
        fs.copyFileSync(mdiSourcePath, mdiDestPath)
        this.emitFile({
          type: 'asset',
          fileName: 'assets/materialdesignicons.min.css',
          source: fs.readFileSync(mdiSourcePath)
        })
      }

      // Copy MDI Font files (fonts folder)
      const mdiFontsSourceDir = path.join(process.cwd(), 'node_modules', '@mdi', 'font', 'fonts')
      const mdiFontsDestDir = path.join(process.cwd(), 'dist', 'fonts')
      if (fs.existsSync(mdiFontsSourceDir)) {
        if (!fs.existsSync(mdiFontsDestDir)) {
          fs.mkdirSync(mdiFontsDestDir, { recursive: true })
        }
        
        const fontFiles = fs.readdirSync(mdiFontsSourceDir)
        fontFiles.forEach(file => {
          const srcPath = path.join(mdiFontsSourceDir, file)
          const destPath = path.join(mdiFontsDestDir, file)
          fs.copyFileSync(srcPath, destPath)
          this.emitFile({
            type: 'asset',
            fileName: `fonts/${file}`,
            source: fs.readFileSync(srcPath)
          })
        })
      }
    }
  }
}