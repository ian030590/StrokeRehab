import { useCallback, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useT } from '../../i18n';
import { addUser, getActiveUser, getUsers, removeUser, setActiveUser } from '../../utils/settings';
import type { TrainingModuleId } from '../home/trainingModules';

export function TrainingPage() {
  const { t } = useT();
  const [searchParams] = useSearchParams();
  const requestedModuleId = searchParams.get('module');
  const moduleId: TrainingModuleId = requestedModuleId === 'cognitive-training'
    ? 'cognitive-training'
    : requestedModuleId === 'speech-training'
      ? 'speech-training'
      : 'motor-training';
  const [users, setUsersState] = useState(getUsers);
  const [activeUser, setActiveUserState] = useState(getActiveUser);
  const [newName, setNewName] = useState('');
  const [showAddUser, setShowAddUser] = useState(false);

  const refreshUsers = useCallback(() => {
    setUsersState(getUsers());
    setActiveUserState(getActiveUser());
  }, []);

  const handleSelectUser = (name: string) => {
    setActiveUser(name || null);
    setActiveUserState(name || null);
  };

  const handleAddUser = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    addUser(trimmed);
    setActiveUser(trimmed);
    setNewName('');
    setShowAddUser(false);
    refreshUsers();
  };

  const handleRemoveUser = (name: string) => {
    if (confirm(t('home.deleteUserPrompt', { name }))) {
      removeUser(name);
      refreshUsers();
    }
  };

  let titleKey: any = 'home.module.motor.title';
  if (moduleId === 'cognitive-training') {
    titleKey = 'home.module.cognitive.title';
  } else if (moduleId === 'speech-training') {
    titleKey = 'home.module.speech.title';
  }

  return (
    <div className="page-content">
      <div className="user-selector">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
        <select
          value={activeUser || ''}
          onChange={(e) => handleSelectUser(e.target.value)}
        >
          <option value="">{t('home.selectUser')}</option>
          {users.map((user) => (
            <option key={user} value={user}>{user}</option>
          ))}
        </select>
        <button className="btn btn-primary btn-sm" onClick={() => setShowAddUser(!showAddUser)}>
          {showAddUser ? t('btn.cancel') : t('btn.add')}
        </button>
        {activeUser && (
          <button className="btn btn-danger btn-sm" onClick={() => handleRemoveUser(activeUser)}>
            {t('btn.delete')}
          </button>
        )}
      </div>

      {showAddUser && (
        <div className="user-selector fade-in" style={{ marginTop: -16 }}>
          <input
            className="input"
            type="text"
            placeholder={t('home.enterUserName')}
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddUser()}
            autoFocus
          />
          <button className="btn btn-primary btn-sm" onClick={handleAddUser}>
            {t('btn.confirmAdd')}
          </button>
        </div>
      )}

      <h1 className="section-title fade-in-up">{t(titleKey)}</h1>
      <p className="section-subtitle fade-in-up">{t('home.listSubtitle')}</p>
    </div>
  );
}
