import {
  internalsMap,
  refMap,
  refValueMap,
  shadowHostsMap,
  shadowRootMap,
  validationAnchorMap,
  validityMap,
  validationMessageMap
} from './maps';
import {
  createHiddenInput,
  findParentForm,
  getHostRoot,
  initForm,
  initLabels,
  initRef,
  removeHiddenInputs,
  throwIfNotFormAssociated
} from './utils';
import { initAom } from './aom';
import { ValidityState, reconcileValidty, setValid } from './ValidityState';
import { observerCallback, observerConfig } from './mutation-observers';
import { IElementInternals, ICustomElement, LabelsList } from './types';

export class ElementInternals implements IElementInternals {
  ariaAtomic: string;
  ariaAutoComplete: string;
  ariaBusy: string;
  ariaChecked: string;
  ariaColCount: string;
  ariaColIndex: string;
  ariaColSpan: string;
  ariaCurrent: string;
  ariaDisabled: string;
  ariaExpanded: string;
  ariaHasPopup: string;
  ariaHidden: string;
  ariaKeyShortcuts: string;
  ariaLabel: string;
  ariaLevel: string;
  ariaLive: string;
  ariaModal: string;
  ariaMultiLine: string;
  ariaMultiSelectable: string;
  ariaOrientation: string;
  ariaPlaceholder: string;
  ariaPosInSet: string;
  ariaPressed: string;
  ariaReadOnly: string;
  ariaRelevant: string;
  ariaRequired: string;
  ariaRoleDescription: string;
  ariaRowCount: string;
  ariaRowIndex: string;
  ariaRowSpan: string;
  ariaSelected: string;
  ariaSort: string;
  ariaValueMax: string;
  ariaValueMin: string;
  ariaValueNow: string;
  ariaValueText: string;

  static get isPolyfilled() {
    return true;
  }

  constructor(ref: ICustomElement) {
    if (!ref || !ref.tagName || ref.tagName.indexOf('-') === -1) {
      throw new TypeError('Illegal constructor');
    }
    const validity = new ValidityState();
    refMap.set(this, ref);
    validityMap.set(this, validity);
    internalsMap.set(ref, this);
    initAom(ref, this);
    initRef(ref, this);
    Object.seal(this);

    if (ref.constructor['formAssociated']) {
      const { labels, form } = this;
      initLabels(ref, labels);
      initForm(ref, form, this);
    }
  }

  /**
   * Will return true if the element is in a valid state
   */
  checkValidity(): boolean {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to execute 'checkValidity' on 'ElementInternals': The target element is not a form-associated custom element.`);
    const validity = validityMap.get(this);
    if (!validity.valid) {
      const validityEvent = new Event('invalid', {
        bubbles: false,
        cancelable: true,
        composed: false
      });
      ref.dispatchEvent(validityEvent);
    }
    return validity.valid;
  }

  /** The form element the custom element is associated with */
  get form(): HTMLFormElement {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to read the 'form' property from 'ElementInternals': The target element is not a form-associated custom element.`);
    let form;
    if (ref.constructor['formAssociated'] === true) {
      form = findParentForm(ref);
    }
    return form;
  }

  /** A list of all relative form labels for this element */
  get labels(): LabelsList {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to read the 'labels' property from 'ElementInternals': The target element is not a form-associated custom element.`);
    const id = ref.getAttribute('id');
    const hostRoot = getHostRoot(ref);
    if (hostRoot && id) {
      return hostRoot ? hostRoot.querySelectorAll(`[for=${id}]`) : [];
    }
    return [];
  }

  /** Will report the elements validity state */
  reportValidity(): boolean {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to execute 'reportValidity' on 'ElementInternals': The target element is not a form-associated custom element.`);
    const valid =  this.checkValidity();
    const anchor = validationAnchorMap.get(this);
    if (anchor && !ref.constructor['formAssociated']) {
      throw new DOMException(`Failed to execute 'setValidity' on 'ElementInternals': The target element is not a form-associated custom element.`);
    }
    if (!valid && anchor) {
      ref.focus();
      anchor.focus();
    }
    return valid;
  }

  /** Sets the element's value within the form */
  setFormValue(value: string | FormData | null): void {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to execute 'setFormValue' on 'ElementInternals': The target element is not a form-associated custom element.`);
    removeHiddenInputs(this);
    if (value != null && !(value instanceof FormData)) {
      if (ref.getAttribute('name')) {
        const hiddenInput = createHiddenInput(ref, this);
        hiddenInput.value = value;
      }
    } else if (value != null && value instanceof FormData) {
      value.forEach((formDataValue, formDataKey) => {
        if (typeof formDataValue === 'string') {
          const hiddenInput = createHiddenInput(ref, this);
          hiddenInput.name = formDataKey;
          hiddenInput.value = formDataValue;
        }
      });
    }
    refValueMap.set(ref, value);
  }

  /**
   * Sets the element's validity. The first argument is a partial ValidityState object
   * reflecting the changes to be made to the element's validity. If the element is invalid,
   * the second argument sets the element's validition message.
   *
   * If the field is valid and a message is specified, the method will throw a TypeError.
   */
  setValidity(validityChanges: Partial<globalThis.ValidityState>, validationMessage?: string, anchor?: HTMLElement) {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to execute 'setValidity' on 'ElementInternals': The target element is not a form-associated custom element.`);
    if (!validityChanges) {
      throw new TypeError('Failed to execute \'setValidity\' on \'ElementInternals\': 1 argument required, but only 0 present.');
    }
    validationAnchorMap.set(this, anchor);
    const validity = validityMap.get(this);
    const validityChangesObj: Partial<ValidityState> = {};
    for (const key in validityChanges) {
      validityChangesObj[key] = validityChanges[key];
    }
    if (Object.keys(validityChangesObj).length === 0) {
      setValid(validity);
    }
    const check = { ...validity, ...validityChangesObj };
    delete check.valid;
    const { valid } = reconcileValidty(validity, check);

    if (!valid && !validationMessage) {
      throw new DOMException(`Failed to execute 'setValidity' on 'ElementInternals': The second argument should not be empty if one or more flags in the first argument are true.`);
    }
    validationMessageMap.set(this, valid ? '' : validationMessage);
    ref.setAttribute('aria-invalid', `${!valid}`);
  }

  get shadowRoot(): ShadowRoot | null {
    const ref = refMap.get(this);
    const shadowRoot = shadowRootMap.get(ref);
    if (shadowRoot) {
      return shadowRootMap.get(ref);
    }
    return null;
  }

  /** The element's validation message set during a call to ElementInternals.setValidity */
  get validationMessage(): string {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to read the 'validationMessage' property from 'ElementInternals': The target element is not a form-associated custom element.`);
    return validationMessageMap.get(this);
  }

  /** The current validity state of the object */
  get validity(): globalThis.ValidityState {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to read the 'validity' property from 'ElementInternals': The target element is not a form-associated custom element.`);
    const validity = validityMap.get(this);
    return validity;
  }

  /** If true the element will participate in a form's constraint validation. */
  get willValidate(): boolean {
    const ref = refMap.get(this);
    throwIfNotFormAssociated(ref, `Failed to read the 'willValidate' property from 'ElementInternals': The target element is not a form-associated custom element.`);
    if (ref.disabled || ref.hasAttribute('disabled')) {
      return false;
    }
    return true;
  }
}

declare global {
  interface Window {
    ElementInternals: typeof ElementInternals
  }
}

if (!window.ElementInternals) {
  window.ElementInternals = ElementInternals;

  function attachShadowObserver(...args) {
    const shadowRoot = attachShadow.apply(this, args);
    const observer = new MutationObserver(observerCallback);
    shadowRootMap.set(this, shadowRoot);
    observer.observe(shadowRoot, observerConfig);
    shadowHostsMap.set(this, observer);
    return shadowRoot;
  }

  /**
   * Attaches an ElementInternals instance to a custom element. Calling this method
   * on a built-in element will throw an error.
   */
  Object.defineProperty(Element.prototype, 'attachInternals', {
    get() {
      return () => {
        if (this.tagName.indexOf('-') === -1) {
          throw new Error(`Failed to execute 'attachInternals' on 'HTMLElement': Unable to attach ElementInternals to non-custom elements.`);
        }
        return new ElementInternals(this);
      };
    }
  });

  const attachShadow = Element.prototype.attachShadow;
  Element.prototype.attachShadow = attachShadowObserver;

  const documentObserver = new MutationObserver(observerCallback);
  documentObserver.observe(document.documentElement, observerConfig);
}
