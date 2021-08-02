import Chat from '@components/Chat';
import { ChatZone, Section } from '@components/ChatList/styles';
import { IDM } from '@typings/db';
import React, { useCallback, useRef, VFC } from 'react';
import { Scrollbars } from 'react-custom-scrollbars';
interface Props {
  chatData?: IDM[];
}

const ChatList: VFC<Props> = ({ chatData }) => {
  const scrollbarRef = useRef(null);
  // 스크롤바 올릴 때 과거 채팅들 로딩이벤트
  const onScroll = useCallback(() => {}, []);
  return (
    <ChatZone>
      <Scrollbars autoHide ref={scrollbarRef} onScrollFrame={onScroll}>
        {chatData?.map((chat) => (
          <Chat key={chat.id} data={chat} />
        ))}
      </Scrollbars>
    </ChatZone>
  );
};

export default ChatList;
