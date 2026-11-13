/** Session flag: the opening animation has been shown (or skipped) in this browser session. */
export const INTRO_KEY = "ta-intro-seen";

/**
 * Runs before first paint (inlined in the layout): returning visitors in the same browser session,
 * and anyone who asked for reduced motion, never see the opening animation.
 */
export const INTRO_GUARD = `try{if(sessionStorage.getItem("${INTRO_KEY}")||matchMedia("(prefers-reduced-motion: reduce)").matches)document.documentElement.dataset.intro="skip"}catch(e){}`;
