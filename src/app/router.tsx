import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './shell/AppShell'
import { SplashPage } from '../pages/SplashPage'
import { TeachersPage } from '../pages/TeachersPage'
import { RoomsPage } from '../pages/RoomsPage'
import { GroupsPage } from '../pages/GroupsPage'
import { SubjectsPage } from '../pages/SubjectsPage'
import { PreferencesPage } from '../pages/PreferencesPage'
import { SchedulePage } from '../pages/SchedulePage'
import { SatisfactionPage } from '../pages/SatisfactionPage'
import { GroupLoadsPage } from '../pages/GroupLoadsPage'

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<SplashPage />} />

      <Route path="/app" element={<AppShell />}>
        <Route index element={<Navigate to="/app/teachers" replace />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route path="preferences" element={<PreferencesPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="rooms" element={<RoomsPage />} />
        <Route path="groups" element={<GroupsPage />} />
        <Route path="schedule" element={<SchedulePage />} />
        <Route path="satisfaction" element={<SatisfactionPage />} />
        <Route path="group-loads" element={<GroupLoadsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}


