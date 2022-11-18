import React, { lazy, Suspense } from "react";
import clsx from "clsx";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import styles from "./index.module.css";
import BrowserOnly from "@docusaurus/BrowserOnly";

const HylimoEditor = lazy(() => import("../components/HylimoEditor"));

export default function Home(): JSX.Element {
    const { siteConfig } = useDocusaurusContext();
    return (
        <Layout>
            <main className={clsx(styles.main)}>
                <BrowserOnly>
                    {() => (
                        <Suspense fallback="Loading...">
                            <HylimoEditor />
                        </Suspense>
                    )}
                </BrowserOnly>
            </main>
        </Layout>
    );
}
