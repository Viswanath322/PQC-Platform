import React from 'react';
import { FloatingGlassNavbar } from '../navigation/FloatingGlassNavbar';
import type { NavPage } from '../navigation/FloatingGlassNavbar';

export type { NavPage };

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  isHovered?: boolean;
  onHoverChange?: (hovered: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  return <FloatingGlassNavbar currentPage={currentPage} onNavigate={onNavigate} />;
};
