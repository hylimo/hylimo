import React from "react";
import clsx from "clsx";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import styles from "./index.module.css";
import { HylimoEditor } from "../components/HylimoEditor";

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout>
      <main className={clsx(styles.main)}>
      <HylimoEditor/>
      </main>
    </Layout>
  );
}

