import Chat from '@components/Chat';
import { ChatZone, Section, StickyHeader } from '@components/ChatList/styles';
import { IDM } from '@typings/db';
import React, { useCallback, useRef, VFC } from 'react';
import { Scrollbars } from 'react-custom-scrollbars';
interface Props {
  chatSections: { [key: string]: IDM[] };
}

const ChatList: VFC<Props> = ({ chatSections }) => {
  const scrollbarRef = useRef(null);
  // 스크롤바 올릴 때 과거 채팅들 로딩이벤트
  const onScroll = useCallback(() => {}, []);
  return (
    <ChatZone>
      <Scrollbars autoHide ref={scrollbarRef} onScrollFrame={onScroll}>
        {Object.entries(chatSections).map(([date, chats]) => {
          return (
            <Section className={`section-${date}`} key={date}>
              <StickyHeader>
                <button>{date}</button>
              </StickyHeader>
              {chats.map((chat) => (
                <Chat key={chat.id} data={chat} />
              ))}
            </Section>
          );
        })}
      </Scrollbars>
    </ChatZone>
  );
};

export default ChatList;
