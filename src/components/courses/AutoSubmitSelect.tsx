'use client';

/**
 * A filter <select> that applies itself: choosing an option submits its form.
 * Without JavaScript the form's own submit button still works.
 */
export function AutoSubmitSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      onChange={(e) => {
        const form = e.currentTarget.form;
        // requestSubmit arrived in Safari 16; submit() covers older ones.
        if (form?.requestSubmit) form.requestSubmit();
        else form?.submit();
      }}
    />
  );
}
