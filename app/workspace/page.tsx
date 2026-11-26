import {requireChatGPTUser} from '../chatgpt-auth';import {WorkspaceContent} from '@moneta/workspace';
export const dynamic='force-dynamic';
export default async function Workspace(){await requireChatGPTUser('/workspace');return <WorkspaceContent/>}
