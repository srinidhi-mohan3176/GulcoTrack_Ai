// Hands a report from the upload screen to the Add Lab Report form without putting large data in the route.
let draft = null;
export const setDraft = (d) => { draft = d; };
export const getDraft = () => draft;
export const clearDraft = () => { draft = null; };
