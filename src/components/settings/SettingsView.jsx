import React from 'react';
import ProfileModal from '../profile/modals/ProfileModal';

export default function SettingsView(props) {
  return <ProfileModal {...props} />;
}
export { SettingsView };
export { default as ProfileModal } from '../profile/modals/ProfileModal';
