import React from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import {
  InstantSearch,
  useSearchBox,
  useHits,
  Configure,
} from "react-instantsearch";
import getAlgoliaClient from "../../../lib/getalgolia";
import styles from "./styles.module.css";
import Link from "@docusaurus/Link";

export default function Search({ initialValue = "", filters = [] }) {
  const searchClient = getAlgoliaClient();
  const {
    siteConfig: { customFields },
  } = useDocusaurusContext();
  return (
    <div className={styles.searchWrapper}>
      <InstantSearch
        indexName={customFields.algoliaIndex}
        searchClient={searchClient}
      >
        <CustomSearchBox placeholder={initialValue} />
        <CustomHits />
        {filters === [] ? (
          <Configure hitsPerPage={20} />
        ) : (
          <Configure hitsPerPage={20} tagFilters={filters} />
        )}
      </InstantSearch>
    </div>
  );
}

function CustomHits() {
  const { hits } = useHits();
  if (hits.length === 0) {
    return <div />;
  }
  return (
    <div className={styles.searchResultsContainer}>
      {hits.map((res) => (
        <Link
          to={res.path.replace("https://tafsir.institute", "")}
          key={res.objectID}
        >
          <div className={styles.searchResItemContainer}>
            <div className={styles.textCol}>
              <div className={styles.searchResTitle}>{res.title}</div>
              {res.description !== "" && (
                <div className={styles.searchResDesc}>{res.description}</div>
              )}
              {res.categories.length > 0 && (
                <div className={styles.taglineSearch}>
                  {res.categories.map((cat, index) => (
                    <span className="badge badge--info" key={`${res.objectID}_${index}`}>
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {res.description === "" && (
              <div className={styles.imgCol}>
                <img src={res.image} />
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}

function CustomSearchBox({ placeholder }) {
  const { query, refine } = useSearchBox();

  return (
    <input
      placeholder={placeholder}
      value={query}
      onChange={(event) => refine(event.target.value)}
      className={styles.searchBox}
      type="search"
    />
  );
}
