import styled from '@emotion/styled'; // v11.11.0
import { colors, spacing, breakpoints } from '../../../styles/theme.styles';
import { fontSize, fontWeight } from '../../../styles/typography.styles';

// Card elevation constants
const CARD_ELEVATION = {
  DEFAULT: '0 2px 4px rgba(0, 0, 0, 0.1)',
  HOVER: '0 4px 8px rgba(0, 0, 0, 0.15)',
  ACTIVE: '0 1px 2px rgba(0, 0, 0, 0.2)'
} as const;

// Card style constants
const CARD_BORDER_RADIUS = '8px';
const CARD_TRANSITIONS = 'box-shadow 0.2s ease-in-out, transform 0.2s ease-in-out';

interface CardContainerProps {
  elevation?: 'default' | 'raised';
  interactive?: boolean;
}

export const CardContainer = styled.div<CardContainerProps>`
  background-color: ${colors.background};
  border-radius: ${CARD_BORDER_RADIUS};
  box-shadow: ${props => props.elevation === 'raised' 
    ? CARD_ELEVATION.HOVER 
    : CARD_ELEVATION.DEFAULT};
  padding: ${spacing.md};
  margin-bottom: ${spacing.md};
  transition: ${CARD_TRANSITIONS};
  border: 1px solid ${colors.border};
  position: relative;
  overflow: hidden;

  /* Interactive state styles */
  ${props => props.interactive && `
    cursor: pointer;
    
    &:hover {
      box-shadow: ${CARD_ELEVATION.HOVER};
      transform: translateY(-2px);
    }
    
    &:active {
      box-shadow: ${CARD_ELEVATION.ACTIVE};
      transform: translateY(0);
    }
  `}

  /* Focus management */
  &:focus-visible {
    outline: 2px solid ${colors.primary};
    outline-offset: 2px;
  }

  /* Responsive styles */
  ${breakpoints.up('tablet')} {
    padding: ${spacing.lg};
  }

  /* RTL Support */
  [dir='rtl'] & {
    text-align: right;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    background-color: ${colors.surface};
    border-color: rgba(255, 255, 255, 0.1);
  }

  /* Print styles */
  @media print {
    box-shadow: none;
    border: 1px solid #000;
  }
`;

interface CardHeaderProps {
  variant?: 'default' | 'emphasized';
}

export const CardHeader = styled.div<CardHeaderProps>`
  padding-bottom: ${spacing.md};
  border-bottom: 1px solid ${colors.border};
  margin-bottom: ${spacing.md};

  /* Typography styles */
  font-size: ${props => props.variant === 'emphasized' ? fontSize.lg : fontSize.md};
  font-weight: ${props => props.variant === 'emphasized' ? fontWeight.bold : fontWeight.medium};
  color: ${colors.text};

  /* RTL Support */
  [dir='rtl'] & {
    text-align: right;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    border-bottom-color: rgba(255, 255, 255, 0.1);
  }
`;

interface CardContentProps {
  padding?: 'none' | 'default' | 'large';
}

export const CardContent = styled.div<CardContentProps>`
  padding: ${props => {
    switch (props.padding) {
      case 'none':
        return '0';
      case 'large':
        return spacing.lg;
      default:
        return spacing.md;
    }
  }};

  /* Typography styles */
  font-size: ${fontSize.md};
  line-height: 1.5;
  color: ${colors.textSecondary};

  /* Responsive padding */
  ${breakpoints.up('tablet')} {
    padding: ${props => props.padding === 'large' ? spacing.xl : props.padding === 'none' ? '0' : spacing.lg};
  }
`;

interface CardFooterProps {
  alignment?: 'left' | 'center' | 'right';
}

export const CardFooter = styled.div<CardFooterProps>`
  padding-top: ${spacing.md};
  margin-top: ${spacing.md};
  border-top: 1px solid ${colors.border};
  display: flex;
  align-items: center;
  justify-content: ${props => {
    switch (props.alignment) {
      case 'left':
        return 'flex-start';
      case 'center':
        return 'center';
      case 'right':
        return 'flex-end';
      default:
        return 'flex-start';
    }
  }};

  /* Gap between footer items */
  > * + * {
    margin-left: ${spacing.sm};
  }

  /* RTL Support */
  [dir='rtl'] & {
    > * + * {
      margin-left: 0;
      margin-right: ${spacing.sm};
    }
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    border-top-color: rgba(255, 255, 255, 0.1);
  }
`;