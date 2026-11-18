import { documentationSearch } from '../../../lib/docs-search-index';

export const dynamic = 'force-static';
export const revalidate = false;
export const GET = documentationSearch.staticGET;
