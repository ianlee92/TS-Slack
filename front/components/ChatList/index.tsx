import Chat from '@components/Chat';
import { ChatZone, Section, StickyHeader } from '@components/ChatList/styles';
import { IDM, IChat } from '@typings/db';
import React, { useCallback, forwardRef, MutableRefObject } from 'react';
import { Scrollbars } from 'react-custom-scrollbars';
interface Props {
  chatSections: { [key: string]: (IDM | IChat)[] };
  setSize: (f: (size: number) => number) => Promise<(IDM | IChat)[][] | undefined>;
  isReachingEnd: boolean;
}

const ChatList = forwardRef<Scrollbars, Props>(({ chatSections, setSize, isReachingEnd }, scrollRef) => {
  // 스크롤바 올릴 때 과거 채팅들 로딩이벤트
  const onScroll = useCallback(
    (values) => {
      if (values.scrollTop === 0 && !isReachingEnd) {
        // 끝까지 올린게 아니라면 (끝에도달하면 더이상 새로 들고올필요없음)
        console.log('가장 위');
        // 데이터 추가 로딩 페이지를 하나 더 불러온다
        setSize((prevSize) => prevSize + 1).then(() => {
          // 스크롤 위치 유지
          const current = (scrollRef as MutableRefObject<Scrollbars>)?.current;
          if (current) {
            current.scrollTop(current.getScrollHeight() - values.scrollHeight);
          }
        });
      }
    },
    [scrollRef, isReachingEnd, setSize],
  );
  return (
    <ChatZone>
      <Scrollbars autoHide ref={scrollRef} onScrollFrame={onScroll}>
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
});

export default ChatList;
