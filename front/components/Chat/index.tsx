import { ChatWrapper } from '@components/Chat/styles';
import { IDM } from '@typings/db';
import React, { VFC, memo, useMemo } from 'react';
import gravatar from 'gravatar';
import dayjs from 'dayjs';
import regexifyString from 'regexify-string';
import { Link, useParams } from 'react-router-dom';

interface Props {
  data: IDM;
}
const Chat: VFC<Props> = ({ data }) => {
  const { workspace } = useParams<{ workspace: string; channel: string }>();
  const user = data.Sender; // dm보내는사람 받는사람 Receiver

  // @[이안](1)
  // \d 숫자 + 는 1개이상 ?는 0개나 1개, * 0개 이상, g 모두찾기
  // @[이안]12](1)
  // +는 최대한 많이 이안]12 +?는 최대한 조금 이안
  // |는 또는 \n는 줄바꿈
  const result = useMemo(
    () =>
      regexifyString({
        input: data.content,
        pattern: /@\[(.+?)]\((\d+?)\)|\n/g, // 아이디 줄바꿈
        decorator(match, index) {
          const arr: string[] | null = match.match(/@\[(.+?)]\((\d+?)\)/)!; // 줄바꿈빼고 아이디만
          if (arr) {
            // 아이디에 걸리는 게 있으면
            return (
              // 그 사람한테 dm보내기
              <Link key={match + index} to={`/workspace/${workspace}/dm/${arr[2]}`}>
                @{arr[1]}
              </Link>
            );
          }
          return <br key={index} />; // 줄바꿈
        },
      }),
    [workspace, data.content], // 캐싱을 새로 갱신하는 조건
  );

  return (
    <ChatWrapper>
      <div className="chat-img">
        <img src={gravatar.url(user.email, { s: '36px', d: 'retro' })} alt={user.nickname} />
      </div>
      <div className="chat-text">
        <div className="chat-user">
          <b>{user.nickname}</b>
          <span>{dayjs(data.createdAt).format('h:mm A')}</span>
        </div>
        <p>{result}</p>
      </div>
    </ChatWrapper>
  );
};

export default memo(Chat);
