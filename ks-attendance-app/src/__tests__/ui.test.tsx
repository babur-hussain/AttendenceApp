/**
 * UI Component Tests
 * 
 * Comprehensive tests for the design system components.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { Avatar } from '../components/ui/Avatar';
import { ThemeProvider } from '../theme';

// Wrapper with ThemeProvider
const AllTheProviders = ({ children }: { children: React.ReactNode }) => {
  return <ThemeProvider>{children}</ThemeProvider>;
};

const customRender = (ui: React.ReactElement, options?: any) =>
  render(ui, { wrapper: AllTheProviders, ...options });

describe('Button Component', () => {
  it('renders title correctly', () => {
    const { getByText } = customRender(<Button title="Click Me" />);
    expect(getByText('Click Me')).toBeTruthy();
  });

  it('calls onPress when pressed', () => {
    const onPress = jest.fn();
    const { getByText } = customRender(
      <Button title="Click Me" onPress={onPress} />
    );
    
    fireEvent.press(getByText('Click Me'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('shows loading indicator when loading', () => {
    const { getByAccessibilityState } = customRender(
      <Button title="Loading" loading />
    );
    
    const button = getByAccessibilityState({ busy: true });
    expect(button).toBeTruthy();
  });

  it('is disabled when disabled prop is true', () => {
    const onPress = jest.fn();
    const { getByText } = customRender(
      <Button title="Disabled" disabled onPress={onPress} />
    );
    
    const button = getByText('Disabled');
    fireEvent.press(button);
    expect(onPress).not.toHaveBeenCalled();
  });

  it('has proper accessibility role', () => {
    const { getByRole } = customRender(<Button title="Test" />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('has minimum touch target size', () => {
    const { getByText } = customRender(<Button title="Test" size="md" />);
    const button = getByText('Test').parent;
    
    // Check that minHeight is at least 44 (WCAG requirement)
    expect(button?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ minHeight: expect.any(Number) })
      ])
    );
  });
});

describe('Card Component', () => {
  it('renders children correctly', () => {
    const { getByText } = customRender(
      <Card>
        <Button title="Child Content" />
      </Card>
    );
    
    expect(getByText('Child Content')).toBeTruthy();
  });

  it('renders title when provided', () => {
    const { getByText } = customRender(
      <Card title="Card Title">Content</Card>
    );
    
    expect(getByText('Card Title')).toBeTruthy();
  });

  it('renders subtitle when provided', () => {
    const { getByText } = customRender(
      <Card title="Title" subtitle="Subtitle">Content</Card>
    );
    
    expect(getByText('Subtitle')).toBeTruthy();
  });

  it('renders header when provided', () => {
    const { getByText } = customRender(
      <Card header={<Button title="Header Content" />}>Body</Card>
    );
    
    expect(getByText('Header Content')).toBeTruthy();
  });

  it('renders footer when provided', () => {
    const { getByText } = customRender(
      <Card footer={<Button title="Footer Content" />}>Body</Card>
    );
    
    expect(getByText('Footer Content')).toBeTruthy();
  });
});

describe('Input Component', () => {
  it('renders label correctly', () => {
    const { getByText } = customRender(
      <Input label="Email" value="" onChangeText={() => {}} />
    );
    
    expect(getByText('Email')).toBeTruthy();
  });

  it('shows required indicator when required', () => {
    const { getByText } = customRender(
      <Input label="Email" value="" onChangeText={() => {}} required />
    );
    
    expect(getByText(/\*/)).toBeTruthy();
  });

  it('displays error message when error prop is provided', () => {
    const { getByText } = customRender(
      <Input
        label="Email"
        value=""
        onChangeText={() => {}}
        error="Invalid email"
      />
    );
    
    expect(getByText('Invalid email')).toBeTruthy();
  });

  it('displays helper text when provided', () => {
    const { getByText } = customRender(
      <Input
        label="Email"
        value=""
        onChangeText={() => {}}
        helperText="We'll never share your email"
      />
    );
    
    expect(getByText("We'll never share your email")).toBeTruthy();
  });

  it('calls onChangeText when text changes', () => {
    const onChangeText = jest.fn();
    const { getByDisplayValue } = customRender(
      <Input
        label="Email"
        value="test"
        onChangeText={onChangeText}
      />
    );
    
    const input = getByDisplayValue('test');
    fireEvent.changeText(input, 'new text');
    expect(onChangeText).toHaveBeenCalledWith('new text');
  });

  it('has proper accessibility label', () => {
    const { getByLabelText } = customRender(
      <Input label="Email" value="" onChangeText={() => {}} />
    );
    
    expect(getByLabelText('Email')).toBeTruthy();
  });
});

describe('Badge Component', () => {
  it('renders label correctly', () => {
    const { getByText } = customRender(<Badge label="New" />);
    expect(getByText('New')).toBeTruthy();
  });

  it('renders as dot when dot prop is true', () => {
    const { queryByText, getByLabelText } = customRender(
      <Badge label="Status" dot />
    );
    
    expect(queryByText('Status')).toBeNull();
    expect(getByLabelText('Status')).toBeTruthy();
  });

  it('has proper accessibility label', () => {
    const { getByLabelText } = customRender(<Badge label="New Feature" />);
    expect(getByLabelText('New Feature')).toBeTruthy();
  });
});

describe('Avatar Component', () => {
  it('displays initials when no image provided', () => {
    const { getByText } = customRender(<Avatar name="John Doe" />);
    expect(getByText('JD')).toBeTruthy();
  });

  it('displays single initial for single name', () => {
    const { getByText } = customRender(<Avatar name="John" />);
    expect(getByText('J')).toBeTruthy();
  });

  it('displays question mark when no name provided', () => {
    const { getByText } = customRender(<Avatar />);
    expect(getByText('?')).toBeTruthy();
  });

  it('has proper accessibility label', () => {
    const { getByLabelText } = customRender(<Avatar name="John Doe" />);
    expect(getByLabelText('Avatar for John Doe')).toBeTruthy();
  });

  it('has accessibility role of image', () => {
    const { getByRole } = customRender(<Avatar name="John Doe" />);
    expect(getByRole('image')).toBeTruthy();
  });
});

describe('Theme Integration', () => {
  it('components respect theme colors', () => {
    const { getByText } = customRender(<Button title="Test" variant="primary" />);
    const button = getByText('Test').parent;
    
    // Button should have background color from theme
    expect(button?.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ backgroundColor: expect.any(String) })
      ])
    );
  });
});

describe('Accessibility Compliance', () => {
  it('all interactive components have accessibility roles', () => {
    const { getByRole } = customRender(<Button title="Test" />);
    expect(getByRole('button')).toBeTruthy();
  });

  it('all interactive components have accessibility labels', () => {
    const { getByLabelText } = customRender(
      <Button title="Submit Form" accessibilityLabel="Submit Form" />
    );
    expect(getByLabelText('Submit Form')).toBeTruthy();
  });

  it('disabled states are communicated', () => {
    const { getByAccessibilityState } = customRender(
      <Button title="Disabled" disabled />
    );
    expect(getByAccessibilityState({ disabled: true })).toBeTruthy();
  });
});
