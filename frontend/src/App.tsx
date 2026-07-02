import { BrowserRouter } from 'react-router-dom'

import { AppShell } from './AppShell'
import { I18nProvider } from './i18n/I18nProvider'
import './App.css'

function App() {
  return (
    <I18nProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </I18nProvider>
  )
}

export default App
