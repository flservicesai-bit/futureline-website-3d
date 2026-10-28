/**
 * Honeypot — a text field people never see, so only bots that fill in every
 * input will put anything in it. /api/leads quietly drops submissions where
 * it is filled. Hidden with sr-only (not display:none, which bots skip) and
 * kept out of the tab order and the accessibility tree.
 */
export const HONEYPOT_FIELD = 'fl_hp';

export function Honeypot() {
  return (
    <div aria-hidden="true" className="sr-only">
      <label>
        Leave this field empty
        <input type="text" name={HONEYPOT_FIELD} tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

/** The honeypot's value in a submitted form, to send along with the JSON body. */
export function honeypotValue(form: HTMLFormElement): string {
  return String(new FormData(form).get(HONEYPOT_FIELD) ?? '');
}
