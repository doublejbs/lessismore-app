export interface BagTemplateNameEditContext {
  name: string;
  onSave: (name: string) => Promise<void>;
}

let currentContext: BagTemplateNameEditContext | null = null;

export const setBagTemplateNameEditContext = (
  context: BagTemplateNameEditContext
) => {
  currentContext = context;
};

export const getBagTemplateNameEditContext = () => currentContext;

export const clearBagTemplateNameEditContext = () => {
  currentContext = null;
};
