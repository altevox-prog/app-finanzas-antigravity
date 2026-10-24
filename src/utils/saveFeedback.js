export const triggerSaveFeedback = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('app:data-saved'));
  }
};
