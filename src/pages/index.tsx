import Image from 'next/image';
import avatarImg from '../../public/images/avatar.svg';
import { SubscribeButton } from '../components/SubscribeButton';

import styles from './home.module.scss';

import Head from 'next/head';
import { GetStaticProps } from 'next';
import { stripe } from '../services/stripe';

interface HomeProps {
  product: {
    priceId: string;
    amount: number;
  };
}

export default function Home({ product }: HomeProps) {
  return (
    <>
      <Head>
        <title>Index | ig.news</title>
      </Head>

      <main className={styles.contentContainer}>
        <section className={styles.hero}>
          <span>👏 Hey, welcome</span>
          <h1>
            News about the <span>React</span> world.
          </h1>
          <p>
            Get access to all the publications <br />
            <span>for {product.amount} /month</span>
          </p>
          <SubscribeButton priceId={product.priceId} />
        </section>
        <Image src={avatarImg} alt="Girl coding" />
      </main>
    </>
  );
}

export const getStaticProps: GetStaticProps = async () => {
  const price = await stripe.prices.retrieve('price_1J7WNmGFU7rm8q6TF6VFqwkU');

  const product = {
    priceId: price.id,
    amount: new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      //@ts-ignore
    }).format(price.unit_amount / 100),
  };

  return {
    props: {
      product,
    },
    revalidate: 60 * 60 * 24,  //24 hours
  };
};
