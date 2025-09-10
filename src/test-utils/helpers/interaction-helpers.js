// User interaction test helpers

import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

/**
 * Click a button by text or role
 * @param {string} buttonText - Button text or accessible name
 * @param {Object} user - userEvent instance (optional, will create if not provided)
 * @returns {Promise} Promise that resolves after click
 */
export const clickButton = async (buttonText, user = null) => {
  const userEventInstance = user || userEvent.setup();
  const button = screen.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await userEventInstance.click(button);
  return button;
};

/**
 * Click a link by text or role
 * @param {string} linkText - Link text or accessible name
 * @param {Object} user - userEvent instance (optional)
 * @returns {Promise} Promise that resolves after click
 */
export const clickLink = async (linkText, user = null) => {
  const userEventInstance = user || userEvent.setup();
  const link = screen.getByRole('link', { name: new RegExp(linkText, 'i') });
  await userEventInstance.click(link);
  return link;
};

/**
 * Type text into an input field
 * @param {string} fieldLabel - Field label, placeholder, or accessible name
 * @param {string} text - Text to type
 * @param {Object} user - userEvent instance (optional)
 * @param {Object} options - Additional options
 * @returns {Promise} Promise that resolves after typing
 */
export const typeInField = async (fieldLabel, text, user = null, options = {}) => {
  const userEventInstance = user || userEvent.setup();
  const { clear = true, delay = null } = options;
  
  // Try multiple ways to find the field
  let field;
  try {
    field = screen.getByLabelText(new RegExp(fieldLabel, 'i'));
  } catch {
    try {
      field = screen.getByPlaceholderText(new RegExp(fieldLabel, 'i'));
    } catch {
      try {
        field = screen.getByRole('textbox', { name: new RegExp(fieldLabel, 'i') });
      } catch {
        field = screen.getByDisplayValue(''); // Fallback for empty fields
      }
    }
  }
  
  if (clear) {
    await userEventInstance.clear(field);
  }
  
  if (delay) {
    await userEventInstance.type(field, text, { delay });
  } else {
    await userEventInstance.type(field, text);
  }
  
  return field;
};

/**
 * Select an option from a dropdown/select element
 * @param {string} selectLabel - Select element label or accessible name
 * @param {string} optionText - Option text to select
 * @param {Object} user - userEvent instance (optional)
 * @returns {Promise} Promise that resolves after selection
 */
export const selectOption = async (selectLabel, optionText, user = null) => {
  const userEventInstance = user || userEvent.setup();
  
  const select = screen.getByLabelText(new RegExp(selectLabel, 'i')) ||
                screen.getByRole('combobox', { name: new RegExp(selectLabel, 'i') });
  
  await userEventInstance.selectOptions(select, optionText);
  return select;
};

/**
 * Check or uncheck a checkbox
 * @param {string} checkboxLabel - Checkbox label or accessible name
 * @param {boolean} checked - Whether to check (true) or uncheck (false)
 * @param {Object} user - userEvent instance (optional)
 * @returns {Promise} Promise that resolves after interaction
 */
export const toggleCheckbox = async (checkboxLabel, checked = true, user = null) => {
  const userEventInstance = user || userEvent.setup();
  
  const checkbox = screen.getByLabelText(new RegExp(checkboxLabel, 'i')) ||
                  screen.getByRole('checkbox', { name: new RegExp(checkboxLabel, 'i') });
  
  if (checkbox.checked !== checked) {
    await userEventInstance.click(checkbox);
  }
  
  return checkbox;
};

/**
 * Upload a file to a file input
 * @param {string} inputLabel - File input label or accessible name
 * @param {File|Array<File>} files - File(s) to upload
 * @param {Object} user - userEvent instance (optional)
 * @returns {Promise} Promise that resolves after upload
 */
export const uploadFile = async (inputLabel, files, user = null) => {
  const userEventInstance = user || userEvent.setup();
  
  const fileInput = screen.getByLabelText(new RegExp(inputLabel, 'i')) ||
                   screen.getByRole('button', { name: new RegExp(inputLabel, 'i') });
  
  await userEventInstance.upload(fileInput, files);
  return fileInput;
};

/**
 * Submit a form by clicking the submit button
 * @param {string} submitText - Submit button text (default: 'submit')
 * @param {Object} user - userEvent instance (optional)
 * @returns {Promise} Promise that resolves after submission
 */
export const submitForm = async (submitText = 'submit', user = null) => {
  const userEventInstance = user || userEvent.setup();
  
  const submitButton = screen.getByRole('button', { name: new RegExp(submitText, 'i') }) ||
                      screen.getByRole('button', { type: 'submit' });
  
  await userEventInstance.click(submitButton);
  return submitButton;
};

/**
 * Fill out an entire form with provided data
 * @param {Object} formData - Object with field names as keys and values to enter
 * @param {Object} user - userEvent instance (optional)
 * @returns {Promise} Promise that resolves after filling all fields
 */
export const fillForm = async (formData, user = null) => {
  const userEventInstance = user || userEvent.setup();
  const filledFields = {};
  
  for (const [fieldName, value] of Object.entries(formData)) {
    if (value !== null && value !== undefined) {
      try {
        const field = await typeInField(fieldName, value.toString(), userEventInstance);
        filledFields[fieldName] = field;
      } catch (error) {
        console.warn(`Could not fill field "${fieldName}":`, error.message);
      }
    }
  }
  
  return filledFields;
};

/**
 * Wait for an element to appear and then interact with it
 * @param {Function} findElement - Function that returns the element
 * @param {Function} interaction - Function that performs the interaction
 * @param {Object} options - Wait options
 * @returns {Promise} Promise that resolves after interaction
 */
export const waitAndInteract = async (findElement, interaction, options = {}) => {
  const { timeout = 5000 } = options;
  
  await waitFor(findElement, { timeout });
  const element = findElement();
  await interaction(element);
  return element;
};

/**
 * Simulate keyboard navigation
 * @param {string} key - Key to press (e.g., 'Tab', 'Enter', 'Escape')
 * @param {Object} user - userEvent instance (optional)
 * @param {Object} options - Key press options
 * @returns {Promise} Promise that resolves after key press
 */
export const pressKey = async (key, user = null, options = {}) => {
  const userEventInstance = user || userEvent.setup();
  await userEventInstance.keyboard(`{${key}}`);
};

/**
 * Simulate typing a sequence of keys
 * @param {string} keys - Key sequence to type
 * @param {Object} user - userEvent instance (optional)
 * @returns {Promise} Promise that resolves after typing
 */
export const typeKeys = async (keys, user = null) => {
  const userEventInstance = user || userEvent.setup();
  await userEventInstance.keyboard(keys);
};

/**
 * Hover over an element
 * @param {HTMLElement|string} elementOrText - Element or text to find element
 * @param {Object} user - userEvent instance (optional)
 * @returns {Promise} Promise that resolves after hover
 */
export const hoverElement = async (elementOrText, user = null) => {
  const userEventInstance = user || userEvent.setup();
  
  let element;
  if (typeof elementOrText === 'string') {
    element = screen.getByText(new RegExp(elementOrText, 'i'));
  } else {
    element = elementOrText;
  }
  
  await userEventInstance.hover(element);
  return element;
};

/**
 * Simulate drag and drop interaction
 * @param {HTMLElement|string} source - Source element or text to find it
 * @param {HTMLElement|string} target - Target element or text to find it
 * @returns {Promise} Promise that resolves after drag and drop
 */
export const dragAndDrop = async (source, target) => {
  let sourceElement, targetElement;
  
  if (typeof source === 'string') {
    sourceElement = screen.getByText(new RegExp(source, 'i'));
  } else {
    sourceElement = source;
  }
  
  if (typeof target === 'string') {
    targetElement = screen.getByText(new RegExp(target, 'i'));
  } else {
    targetElement = target;
  }
  
  fireEvent.dragStart(sourceElement);
  fireEvent.dragEnter(targetElement);
  fireEvent.dragOver(targetElement);
  fireEvent.drop(targetElement);
  fireEvent.dragEnd(sourceElement);
  
  return { source: sourceElement, target: targetElement };
};

/**
 * Wait for loading states to complete
 * @param {Object} options - Wait options
 * @returns {Promise} Promise that resolves when loading is complete
 */
export const waitForLoadingToComplete = async (options = {}) => {
  const { timeout = 10000 } = options;
  
  await waitFor(() => {
    // Check for common loading indicators
    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/please wait/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  }, { timeout });
};

/**
 * Simulate mobile touch interactions
 */
export const mobileInteractions = {
  /**
   * Simulate a swipe gesture
   * @param {HTMLElement} element - Element to swipe on
   * @param {string} direction - Swipe direction ('left', 'right', 'up', 'down')
   * @param {number} distance - Swipe distance in pixels
   */
  swipe: async (element, direction = 'left', distance = 100) => {
    const startCoords = { x: 100, y: 100 };
    const endCoords = { ...startCoords };
    
    switch (direction) {
      case 'left':
        endCoords.x -= distance;
        break;
      case 'right':
        endCoords.x += distance;
        break;
      case 'up':
        endCoords.y -= distance;
        break;
      case 'down':
        endCoords.y += distance;
        break;
    }
    
    fireEvent.touchStart(element, {
      touches: [{ clientX: startCoords.x, clientY: startCoords.y }]
    });
    
    fireEvent.touchMove(element, {
      touches: [{ clientX: endCoords.x, clientY: endCoords.y }]
    });
    
    fireEvent.touchEnd(element);
  },

  /**
   * Simulate a long press
   * @param {HTMLElement} element - Element to long press
   * @param {number} duration - Press duration in milliseconds
   */
  longPress: async (element, duration = 500) => {
    fireEvent.touchStart(element);
    
    await new Promise(resolve => setTimeout(resolve, duration));
    
    fireEvent.touchEnd(element);
  },

  /**
   * Simulate a pinch gesture
   * @param {HTMLElement} element - Element to pinch
   * @param {number} scale - Scale factor (< 1 for pinch in, > 1 for pinch out)
   */
  pinch: async (element, scale = 0.5) => {
    const centerX = 100;
    const centerY = 100;
    const distance = 50;
    
    // Start with two fingers apart
    fireEvent.touchStart(element, {
      touches: [
        { clientX: centerX - distance, clientY: centerY },
        { clientX: centerX + distance, clientY: centerY }
      ]
    });
    
    // Move fingers closer together or further apart
    const newDistance = distance * scale;
    fireEvent.touchMove(element, {
      touches: [
        { clientX: centerX - newDistance, clientY: centerY },
        { clientX: centerX + newDistance, clientY: centerY }
      ]
    });
    
    fireEvent.touchEnd(element);
  },
};

/**
 * Common form interaction patterns
 */
export const formInteractions = {
  /**
   * Complete a login form
   * @param {string} email - Email to enter
   * @param {string} password - Password to enter
   * @param {Object} user - userEvent instance (optional)
   */
  login: async (email, password, user = null) => {
    await fillForm({ email, password }, user);
    await submitForm('sign in', user);
  },

  /**
   * Complete a signup form
   * @param {Object} userData - User data object
   * @param {Object} user - userEvent instance (optional)
   */
  signup: async (userData, user = null) => {
    const { email, password, name, confirmPassword } = userData;
    await fillForm({ 
      email, 
      password, 
      name, 
      'confirm password': confirmPassword || password 
    }, user);
    await submitForm('sign up', user);
  },

  /**
   * Complete a plant instance form
   * @param {Object} plantData - Plant instance data
   * @param {Object} user - userEvent instance (optional)
   */
  createPlantInstance: async (plantData, user = null) => {
    const { nickname, location, notes } = plantData;
    await fillForm({ nickname, location, notes }, user);
    await submitForm('save', user);
  },

  /**
   * Complete a care record form
   * @param {Object} careData - Care record data
   * @param {Object} user - userEvent instance (optional)
   */
  logCare: async (careData, user = null) => {
    const { careType, notes, date } = careData;
    
    if (careType) {
      await selectOption('care type', careType, user);
    }
    
    if (date) {
      await typeInField('date', date, user);
    }
    
    if (notes) {
      await typeInField('notes', notes, user);
    }
    
    await submitForm('log care', user);
  },
};