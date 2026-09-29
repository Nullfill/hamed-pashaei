export const HOME_LAYOUT_QUERY = `
  query getPageLayout($pageID: String!) {
    getPageLayout(pageID: $pageID) {
      status { statusCode message }
      data { rows { title link type order dataType itemType itemID } }
    }
  }
`;

const PROGRAM_FIELDS = `
  id uid title summary description productionYear isSolitary isExclusive
  playType portraitImagePath landscapeImagePath bannerImagePath
`;

export const PROGRAMS_BY_TAG_QUERY = `
  query getProgramsByTagId($TagID: String!, $page: Int!) {
    getProgramsByTagId(TagID: $TagID, page: $page) {
      status { statusCode message }
      pagination { currentPage totalPages totalRecords }
      data { ${PROGRAM_FIELDS} episode { accessType } }
    }
  }
`;

export const SEARCH_QUERY = `
  query search($query: String!, $page: Int!) {
    search(query: $query, page: $page) {
      status { statusCode message }
      data {
        titleMatch { ${PROGRAM_FIELDS} type }
        contextMatch { ${PROGRAM_FIELDS} type }
      }
    }
  }
`;

export const PROGRAM_DETAILS_QUERY = `
  query getProgramByUid($uid: String!) {
    getProgramByUid(uid: $uid) {
      status { statusCode message }
      data {
        program { ${PROGRAM_FIELDS} parentalGuidance }
        cast { name role artists { id fullName imagePath descriptor } }
        categories { id name descriptor }
        genres { id name descriptor }
        seasons { id title productionYear programId landscapeImagePath portraitImagePath }
        solitaryEpisode {
          id uid title summary description duration order accessType playLinkURI
          releaseStatus seasonID portraitImagePath landscapeImagePath
        }
        trailers {
          id title isDefault playLinkURL playLinkURI videoPath coverImagePath duration
          subtitleMetadata { url label direction langCode }
        }
      }
    }
  }
`;

export const SEASON_EPISODES_QUERY = `
  query getSeasonEpisodes($seasonID: String!) {
    getSeasonEpisodes(seasonID: $seasonID) {
      status { statusCode message }
      data {
        id uid title summary description duration order accessType playLinkURI
        releaseStatus seasonID portraitImagePath landscapeImagePath
      }
    }
  }
`;

export const EPISODE_PLAYBACK_QUERY = `
  query getEpisodeByUid($uid: String!) {
    getEpisodeByUid(uid: $uid) {
      status { statusCode message }
      data {
        id uid title accessType playLink playLinkURI releaseStatus
        landscapeImagePath portraitImagePath
        subtitleMetadata { url label direction langCode }
        whitelistedIsps { name descriptor }
      }
    }
  }
`;
