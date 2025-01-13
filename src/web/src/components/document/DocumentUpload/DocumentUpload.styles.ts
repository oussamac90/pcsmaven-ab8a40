import styled from '@emotion/styled'; // v11.11.0
import { css } from '@emotion/react'; // v11.11.0
import { theme } from '../../../styles/theme.styles';
import { mediaQueries } from '../../../styles/breakpoints.styles';

// Base styles for the upload container
export const UploadContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.md};
  background-color: ${theme.colors.background};
  border-radius: ${theme.borderRadius.md};
  box-shadow: ${theme.shadows.sm};
  max-width: 100%;
  margin: 0 auto;

  @media ${mediaQueries.tablet} {
    padding: ${theme.spacing.lg};
    max-width: 800px;
  }

  @media ${mediaQueries.desktop} {
    padding: ${theme.spacing.xl};
    max-width: 1000px;
  }
`;

// Base styles for the drop zone
const baseDropZoneStyles = css`
  border: 2px dashed ${theme.colors.secondary};
  border-radius: ${theme.borderRadius.md};
  padding: ${theme.spacing.lg};
  text-align: center;
  background: ${theme.colors.surface};
  cursor: pointer;
  transition: all ${theme.transitions.normal};
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: ${theme.spacing.md};
  touch-action: none;

  @media ${mediaQueries.tablet} {
    min-height: 250px;
  }

  @media ${mediaQueries.desktop} {
    min-height: 300px;
  }
`;

// Styles for active drag state
const DRAG_ACTIVE_STYLES = css`
  border-color: ${theme.colors.accent};
  background: ${theme.colors.surface};
  opacity: 0.9;
  transform: scale(1.02);
`;

// Styles for rejected drag state
const DRAG_REJECT_STYLES = css`
  border-color: ${theme.colors.error};
  background: rgba(220, 53, 69, 0.1);
  opacity: 0.9;
`;

// Drop zone component with drag states
export const DropZone = styled.div<{
  isDragActive?: boolean;
  isDragReject?: boolean;
}>`
  ${baseDropZoneStyles}
  ${({ isDragActive }) => isDragActive && DRAG_ACTIVE_STYLES}
  ${({ isDragReject }) => isDragReject && DRAG_REJECT_STYLES}

  &:hover {
    border-color: ${theme.colors.accent};
    background: ${theme.colors.surface};
  }

  /* Icon styles */
  svg {
    width: 48px;
    height: 48px;
    color: ${theme.colors.secondary};
    margin-bottom: ${theme.spacing.md};
    transition: color ${theme.transitions.normal};
  }

  /* Text styles */
  p {
    color: ${theme.colors.textSecondary};
    margin: 0;
  }

  /* Support text */
  small {
    color: ${theme.colors.textSecondary};
    font-size: ${theme.typography.fontSize.sm};
  }
`;

// Function to create progress bar styles based on progress
const createProgressBarStyles = (progress: number) => css`
  width: ${progress}%;
  background-color: ${progress === 100
    ? theme.colors.success
    : progress > 0
    ? theme.colors.accent
    : theme.colors.border};
  transition: width ${theme.transitions.normal}, background-color ${theme.transitions.normal};
`;

// Progress bar container
export const ProgressBarContainer = styled.div`
  width: 100%;
  height: 8px;
  background-color: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.sm};
  overflow: hidden;
`;

// Progress bar indicator
export const ProgressBar = styled.div<{ progress: number }>`
  height: 100%;
  ${({ progress }) => createProgressBarStyles(progress)}
`;

// File list container
export const FileList = styled.ul`
  list-style: none;
  padding: 0;
  margin: ${theme.spacing.md} 0;
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.sm};
`;

// Individual file item
export const FileItem = styled.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background-color: ${theme.colors.surface};
  border-radius: ${theme.borderRadius.sm};
  border: 1px solid ${theme.colors.border};

  /* File info container */
  .file-info {
    display: flex;
    align-items: center;
    gap: ${theme.spacing.sm};
    
    /* File icon */
    svg {
      width: 20px;
      height: 20px;
      color: ${theme.colors.secondary};
    }
    
    /* File name */
    span {
      color: ${theme.colors.text};
      font-size: ${theme.typography.fontSize.sm};
    }
  }

  /* Action buttons container */
  .actions {
    display: flex;
    gap: ${theme.spacing.sm};
  }
`;

// Error message styling
export const ErrorMessage = styled.div`
  color: ${theme.colors.error};
  font-size: ${theme.typography.fontSize.sm};
  margin-top: ${theme.spacing.xs};
  display: flex;
  align-items: center;
  gap: ${theme.spacing.xs};

  svg {
    width: 16px;
    height: 16px;
  }
`;