import { NextApiRequest, NextApiResponse } from 'next';
import { Readable } from 'stream';
import Stripe from 'stripe';
import { stripe } from '../../services/stripe';
import { saveSubscription } from './_lib/manageSubscription';

async function buffer(readable: Readable) {
  const chunks = [];

  for await(const chunk of readable) {
    chunks.push(
      typeof chunk === 'string' ? Buffer.from(chunk) : chunk
    );
  }

  return Buffer.concat(chunks);
}

export const config = {
  api: {
    bodyParser: false
  }
};

const relevantEvents = new Set([
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted'
]);

export default async (req: NextApiRequest, res: NextApiResponse) => {
  if(req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405);
  }
  const secret = req.headers['stripe-signature'];
  if(!secret) res.status(401);

  let event: Stripe.Event;
  const buff = await buffer(req);

  try {
    event = stripe.webhooks.constructEvent(buff, secret, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    res.status(400).send(`Webhook error: ${err.message}`)
  }

  const { type, data } = event;

  if(relevantEvents.has(type)) {
    try {
      switch (type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = data.object as Stripe.Subscription;

          console.log("Subscription: ",subscription);

          await saveSubscription(
            subscription.id,
            subscription.customer.toString(),
            false
          );

          break;

        case 'checkout.session.completed':
          const checkoutSession = data.object as Stripe.Checkout.Session;

          await saveSubscription(
            checkoutSession.subscription.toString(),
            checkoutSession.customer.toString(),
            true
          );

          break;
        default:
          throw new Error('Unhandled event.');
      }
    } catch (err) {
      return res.json({error: 'Webhook handler failed.'})
    }
  }


  res.json({ received: true });
};
