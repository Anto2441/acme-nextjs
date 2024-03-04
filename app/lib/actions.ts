'use server';

import { z } from 'zod';
import { sql } from '@vercel/postgres';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  // The id is a string, and is optional.
  id: z.string().optional(),
  // The customerId is a string, and is required.
  customerId: z.string(),
  // The amount is a number, and is required.
  // We are using `z.coerce.number()` to convert the string value from the
  // form to a number.
  amount: z.coerce.number(),
  // The status is an enum, and is required.
  // It can only be one of the two values: 'pending' or 'paid'.
  status: z.enum(['pending', 'paid']),
  // The date is a string, and is required.
  // It is in the format: 'YYYY-MM-DD'.
  date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
  const amountInCents = amount * 100;
  // Generate a date in the format 'YYYY-MM-DD' using the current date and time.
  // The `toISOString()` method returns a string in the format
  // 'YYYY-MM-DDTHH:mm:ss.sssZ', where 'T' is a literal character, and 'Z'
  // represents the time zone (UTC).
  // By splitting the string on 'T', we get an array with two elements:
  // the date and the time portion of the string.
  // We take the first element of the array (the date) and assign it to the
  // variable `date`.
  const date = new Date().toISOString().split('T')[0];

  await sql`
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
  `;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

// Use Zod to update the expected types
// The `omit()` method returns a new schema that is a copy of the original
// schema, but with the specified keys omitted.
// In this case, we are creating a new schema that is a copy of `FormSchema`,
// but without the `id` and `date` keys.
// This is useful when we want to update an existing row in the database,
// and we don't want to include the `id` and `date` fields in the form data
// that we receive from the browser.
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

  await sql`
    UPDATE invoices
    SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    WHERE id = ${id}
  `;

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices');
}
