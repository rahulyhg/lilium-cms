export const LILIUM = {
    vendor : "Lilium CMS",
    v : 4.0
}

export const TIMING = {
    LYS_QUICK_SEARCH : 100
}

export const POST_STATUS = {
    published : { color : "#0d6aad", get w() { return _v('article.statusses.published')}  },
    deleted   : { color : "#b7834e", get w() { return _v('article.statusses.deleted')}  },
    reviewing : { color : "#496540", get w() { return _v('article.statusses.reviewing')}  },
    draft     : { color : "#3f5463", get w() { return _v('article.statusses.draft')}  },
    destroyed : { color : "#333333", get w() { return _v('article.statusses.destroyed')}  }
};